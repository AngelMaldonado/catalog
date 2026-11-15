// Shared code for the public viewer hooks. PocketBase runs every handler in an isolated
// context, so handlers load this module with require() instead of sharing top-level code.

const SIZES = ['480', '960']
const TTL = 10 * 60 // signed URLs live 10 minutes (thread «Visor público»)
const BOTS = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|curl|wget|python|headless/i

/** HMAC secret, created on first use and kept in pb_data (never in the repo). */
function secret() {
  const env = $os.getenv('CATALOG_SIGNING_KEY')
  if (env) return env
  const file = $app.dataDir() + '/catalog-signing.key'
  try {
    return toString($os.readFile(file)).trim()
  } catch (_) {
    const s = $security.randomString(48)
    $os.writeFile(file, s, 0o600)
    return s
  }
}

const now = () => Math.floor(Date.now() / 1000)
const firma = (id, size, exp) => $security.hs256(`${id}/${size}/${exp}`, secret())

function urlFirmada(id, size, exp) {
  return `/api/r/${id}/${size}?exp=${exp}&sig=${firma(id, size, exp)}`
}

function verificar(id, size, exp, sig) {
  if (!SIZES.includes(size)) return false
  const e = parseInt(exp, 10)
  if (!e || e < now()) return false
  return $security.equal(firma(id, size, e), sig || '')
}

const json = (r, f) => {
  const v = r.get(f)
  if (v === null || v === undefined || v === '') return null
  try {
    return JSON.parse(toString(v))
  } catch (_) {
    return v
  }
}
const archivo = (r, f) => (r.getString(f) ? `/api/files/${r.collection().id}/${r.id}/${r.getString(f)}` : '')
const FONDOS = ['cover', 'divider', 'products', 'promo', 'back', 'filler']

/** Everything the viewer needs for a published catalog, with signed render URLs. */
function libro(cat) {
  const exp = now() + TTL
  const tema = $app.findRecordById('themes', cat.getString('theme'))
  const ajustes = $app.findFirstRecordByFilter('settings', '')
  const fondos = {}
  for (const f of FONDOS) fondos[f] = archivo(cat, `bg_${f}`) || archivo(tema, `bg_${f}`)

  const plantillas = {}
  const plantilla = (id) => (plantillas[id] = plantillas[id] || $app.findRecordById('garment_templates', id))
  const productos = $app.findRecordsByFilter('products', 'catalog = {:c}', 'sort', 0, 0, { c: cat.id })
  const renders = $app.findRecordsByFilter('product_renders', 'product.catalog = {:c}', '', 0, 0, { c: cat.id })
  const porProducto = {}
  for (const r of renders) (porProducto[r.getString('product')] = porProducto[r.getString('product')] || []).push(r)

  return {
    catalogo: {
      id: cat.id, name: cat.getString('name'), slug: cat.getString('slug'), page_turn: cat.getString('page_turn'),
      layout: cat.getString('layout'), category_order: json(cat, 'category_order') || [],
    },
    tema: { palette: json(tema, 'palette'), fonts: json(tema, 'fonts'), fondos },
    negocio: {
      nombre: ajustes.getString('business_name'), logo: archivo(ajustes, 'logo'), whatsapp: ajustes.getString('whatsapp'),
      instagram: ajustes.getString('instagram'), facebook: ajustes.getString('facebook'), tiktok: ajustes.getString('tiktok'),
      direccion: ajustes.getString('address'), moneda: ajustes.getString('currency'),
    },
    categorias: $app.findRecordsByFilter('categories', '', 'sort,name', 0, 0).map((c) => ({ id: c.id, name: c.getString('name'), sort: c.getInt('sort') })),
    productos: productos.map((p) => {
      const t = plantilla(p.getString('template'))
      const elegidos = json(p, 'colors') || []
      const rs = porProducto[p.id] || []
      return {
        id: p.id, category: p.getString('category'), sort: p.getInt('sort'), name: p.getString('name'), price: p.getFloat('price'),
        sizes: json(p, 'sizes') || [],
        colores: (json(t, 'colors') || [])
          .filter((c) => elegidos.includes(c.name))
          .map((c) => {
            const r = rs.find((x) => x.getString('color') === c.name)
            return { name: c.name, hex: c.hex, r480: r ? urlFirmada(r.id, '480', exp) : '', r960: r ? urlFirmada(r.id, '960', exp) : '' }
          }),
      }
    }),
    especiales: $app.findRecordsByFilter('pages', 'catalog = {:c}', 'position,created', 0, 0, { c: cat.id }).map((e) => ({
      id: e.id, kind: e.getString('kind'), title: e.getString('title'), body: e.getString('body'), image: archivo(e, 'image'),
      position: e.getInt('position'), created: e.getString('created'),
    })),
    caduca: exp,
  }
}

/** Published catalog by slug, or the current one ('' slug). Null when not visible. */
function publicado(slug) {
  try {
    if (slug) return $app.findFirstRecordByFilter('catalogs', "slug = {:s} && status = 'published'", { s: slug })
    const id = $app.findFirstRecordByFilter('settings', '').getString('current_catalog')
    if (!id) return null
    const c = $app.findRecordById('catalogs', id)
    return c.getString('status') === 'published' ? c : null
  } catch (_) {
    return null
  }
}

/** Day in the business time zone (CATALOG_TZ_OFFSET hours, default −6: Mexico City). */
function dia() {
  const off = parseFloat($os.getenv('CATALOG_TZ_OFFSET') || '-6')
  return new Date(Date.now() + off * 3600 * 1000).toISOString().slice(0, 10)
}

const escapar = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

/** index.html of the SPA with Open Graph tags for a catalog (or the business). */
function indexConMeta(e, cat) {
  const dir = $os.getenv('CATALOG_PUBLIC_DIR') || `${__hooks}/../pb_public`
  let html
  try {
    html = toString($os.readFile(`${dir}/index.html`))
  } catch (_) {
    return null
  }
  const ajustes = $app.findFirstRecordByFilter('settings', '')
  const negocio = ajustes.getString('business_name')
  const proto = e.request.header.get('X-Forwarded-Proto') || (e.request.tls ? 'https' : 'http')
  const base = `${proto}://${e.request.host}`
  const titulo = cat ? `${cat.getString('name')} · ${negocio}` : negocio
  const desc = cat ? `Catálogo de ${negocio}. Hojéalo y pide por WhatsApp.` : `Catálogo de ${negocio}.`
  const img = cat && cat.getString('og_image') ? base + archivo(cat, 'og_image') : ''
  const url = base + (cat ? `/c/${cat.getString('slug')}` : '/')
  const meta = [
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${escapar(titulo)}" />`,
    `<meta property="og:description" content="${escapar(desc)}" />`,
    `<meta property="og:url" content="${escapar(url)}" />`,
    img && `<meta property="og:image" content="${escapar(img)}" />`,
    img && `<meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />`,
    `<meta name="twitter:card" content="${img ? 'summary_large_image' : 'summary'}" />`,
    `<meta name="description" content="${escapar(desc)}" />`,
  ].filter(Boolean).join('\n    ')
  return html.replace(/<title>.*?<\/title>/, `<title>${escapar(titulo)}</title>`).replace('</head>', `    ${meta}\n  </head>`)
}

module.exports = { libro, publicado, verificar, dia, BOTS, indexConMeta }
