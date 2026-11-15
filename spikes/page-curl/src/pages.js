// Spike content: an 11-page seasonal catalog shaped like the real one
// (cover, category dividers, product pages with 1/2/4 items, a promo page, back cover).
// Interior pages = 9 (odd) so the desktop spread needs a filler page, as decided in «Editor».

const G = ['tshirt', 'hoodie', 'cap']
const prod = (i, g) => ({ name: `Diseño ${i}`, price: g === 'cap' ? 280 : g === 'hoodie' ? 650 : 350, g })

export const PAGES = [
  { kind: 'cover', bg: 'cover', title: 'Navidad 2026', sub: 'Catálogo de temporada' },
  { kind: 'divider', bg: 'divider', title: 'Playeras' },
  { kind: 'products', bg: 'products', items: [prod(1, 'tshirt'), prod(2, 'tshirt'), prod(3, 'tshirt'), prod(4, 'tshirt')] },
  { kind: 'products', bg: 'products', items: [prod(5, 'tshirt'), prod(6, 'tshirt')] },
  { kind: 'divider', bg: 'divider', title: 'Sudaderas' },
  { kind: 'products', bg: 'products', items: [prod(7, 'hoodie')] },
  { kind: 'promo', bg: 'cover', title: '2×1 en gorras', sub: 'Sólo esta temporada' },
  { kind: 'products', bg: 'products', items: [prod(8, 'hoodie'), prod(9, 'hoodie'), prod(10, 'hoodie'), prod(11, 'hoodie')] },
  { kind: 'divider', bg: 'divider', title: 'Gorras' },
  { kind: 'products', bg: 'products', items: [prod(12, 'cap'), prod(13, 'cap')] },
  { kind: 'back', bg: 'back', title: 'Pide por WhatsApp', sub: '+52 000 000 0000' },
]

export const FILLER = { kind: 'filler', bg: 'products' }

const bgSize = () => (Math.max(innerWidth, innerHeight) * Math.min(devicePixelRatio, 2) > 1700 ? 1080 : 720)
const imgUrl = (name, size) => `/img/${name}-${size}.webp`

const bitmapCache = new Map()
function bitmap(url) {
  if (!bitmapCache.has(url)) {
    bitmapCache.set(url, fetch(url).then((r) => r.blob()).then((b) => createImageBitmap(b)))
  }
  return bitmapCache.get(url)
}

// Paint an image either as <img> or into a <canvas> (anti-copy option from «Visor público»).
function picture(parent, url, cls, paint, fit) {
  if (paint === 'img') {
    const img = new Image()
    img.decoding = 'async'
    img.draggable = false
    img.className = cls
    img.src = url
    parent.appendChild(img)
    return img.decode().catch(() => {})
  }
  const c = document.createElement('canvas')
  c.className = cls
  parent.appendChild(c)
  return bitmap(url).then((bmp) => {
    // clientWidth/Height = untransformed layout size (a rotated sheet would shrink a bounding rect)
    const dpr = Math.min(devicePixelRatio, 2)
    const w = Math.max(1, Math.round(parent.clientWidth * dpr))
    const h = Math.max(1, Math.round(parent.clientHeight * dpr))
    c.width = w
    c.height = h
    const ctx = c.getContext('2d')
    const s = fit === 'cover' ? Math.max(w / bmp.width, h / bmp.height) : Math.min(w / bmp.width, h / bmp.height)
    const dw = bmp.width * s
    const dh = bmp.height * s
    ctx.drawImage(bmp, (w - dw) / 2, (h - dh) / 2, dw, dh)
  })
}

// Renders page `p` into `host` (an absolutely positioned box). Returns a promise that
// resolves when its images are decoded/painted. Null pages render nothing.
export function renderPage(host, p, index, paint) {
  if (!p) return Promise.resolve()
  const pc = document.createElement('div')
  pc.className = 'pc'
  host.appendChild(pc)
  const jobs = [picture(pc, imgUrl(`bg-${p.bg}`, bgSize()), paint === 'img' ? 'bg' : 'paint', paint, 'cover')]
  if (p.title) {
    const t = document.createElement('div')
    t.className = 'title'
    t.textContent = p.title
    pc.appendChild(t)
  }
  if (p.sub) {
    const s = document.createElement('div')
    s.className = 'sub'
    s.textContent = p.sub
    pc.appendChild(s)
  }
  if (p.items) {
    const grid = document.createElement('div')
    grid.className = `grid n${p.items.length}`
    pc.appendChild(grid)
    const size = p.items.length === 1 ? 960 : 480
    for (const it of p.items) {
      const card = document.createElement('div')
      card.className = 'card'
      const ph = document.createElement('div')
      ph.className = 'ph'
      const meta = document.createElement('div')
      meta.className = 'meta'
      meta.innerHTML = `<span>${it.name}</span><span>$${it.price}</span>`
      card.append(ph, meta)
      grid.appendChild(card)
      jobs.push(picture(ph, imgUrl(it.g, size), '', paint, 'contain'))
    }
  }
  if (index != null) {
    const n = document.createElement('div')
    n.className = 'num'
    n.textContent = String(index + 1)
    pc.appendChild(n)
  }
  return Promise.all(jobs)
}

export { G }

// ---- whole page painted into one canvas (texture source for the WebGL turn) ----
// Mirrors the DOM layout above closely enough for the spike.
function fit(ctx, bmp, x, y, w, h, mode) {
  const s = mode === 'cover' ? Math.max(w / bmp.width, h / bmp.height) : Math.min(w / bmp.width, h / bmp.height)
  const dw = bmp.width * s
  const dh = bmp.height * s
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(bmp, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

export async function paintPage(p, w, h, index) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f4efe6'
  ctx.fillRect(0, 0, w, h)
  if (!p) return c
  fit(ctx, await bitmap(imgUrl(`bg-${p.bg}`, w > 900 ? 1080 : 720)), 0, 0, w, h, 'cover')
  ctx.textAlign = 'center'
  if (p.title) {
    ctx.save()
    ctx.fillStyle = '#fff'
    ctx.shadowColor = 'rgba(0,0,0,.5)'
    ctx.shadowBlur = w * 0.03
    ctx.font = `700 ${Math.round(w * 0.08)}px Georgia, serif`
    ctx.fillText(p.title, w / 2, h * 0.38 + w * 0.08)
    ctx.restore()
  }
  if (p.sub) {
    ctx.fillStyle = 'rgba(255,255,255,.9)'
    ctx.font = `500 ${Math.round(w * 0.04)}px system-ui, sans-serif`
    ctx.fillText(p.sub, w / 2, h * 0.52 + w * 0.04)
  }
  if (p.items) {
    const n = p.items.length
    const cols = n === 4 ? 2 : 1
    const rows = n === 1 ? 1 : 2
    const x0 = w * 0.07
    const y0 = h * 0.09
    const gw = w * 0.86
    const gh = h * 0.84
    const gap = w * 0.04
    const cw = (gw - gap * (cols - 1)) / cols
    const ch = (gh - gap * (rows - 1)) / rows
    const meta = Math.round(w * 0.05)
    const bmps = await Promise.all(p.items.map((it) => bitmap(imgUrl(it.g, n === 1 ? 960 : 480))))
    p.items.forEach((it, k) => {
      const x = x0 + (k % cols) * (cw + gap)
      const y = y0 + Math.floor(k / cols) * (ch + gap)
      ctx.fillStyle = 'rgba(255,255,255,.72)'
      ctx.beginPath()
      ctx.roundRect(x, y, cw, ch, w * 0.015)
      ctx.fill()
      fit(ctx, bmps[k], x, y, cw, ch - meta, 'contain')
      ctx.fillStyle = '#2a2118'
      ctx.font = `600 ${Math.round(w * 0.032)}px system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.fillText(it.name, x + w * 0.015, y + ch - meta * 0.35)
      ctx.textAlign = 'right'
      ctx.fillText(`$${it.price}`, x + cw - w * 0.015, y + ch - meta * 0.35)
    })
  }
  if (index != null) {
    ctx.textAlign = 'right'
    ctx.fillStyle = 'rgba(42,33,24,.6)'
    ctx.font = `${Math.round(w * 0.03)}px system-ui`
    ctx.fillText(String(index + 1), w * 0.96, h * 0.98)
  }
  return c
}
