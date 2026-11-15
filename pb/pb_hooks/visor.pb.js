/// <reference path="../../pb_data/types.d.ts" />
// Public viewer routes (thread «Visor público»). Shared code lives in lib/visor.js.

// Catalog data for the viewer: the current catalog, or one by slug. Only published catalogs.
routerAdd('GET', '/api/visor', (e) => {
  const v = require(`${__hooks}/lib/visor.js`)
  const cat = v.publicado('')
  if (!cat) return e.json(404, { message: 'No hay catálogo vigente.' })
  e.response.header().set('Cache-Control', 'no-store')
  return e.json(200, v.libro(cat))
})

routerAdd('GET', '/api/visor/{slug}', (e) => {
  const v = require(`${__hooks}/lib/visor.js`)
  const cat = v.publicado(e.request.pathValue('slug'))
  if (!cat) return e.json(404, { message: 'Este catálogo no existe o no está publicado.' })
  e.response.header().set('Cache-Control', 'no-store')
  return e.json(200, v.libro(cat))
})

// Product render through a signed, expiring URL (the files themselves are protected).
routerAdd('GET', '/api/r/{id}/{size}', (e) => {
  const v = require(`${__hooks}/lib/visor.js`)
  const id = e.request.pathValue('id')
  const size = e.request.pathValue('size')
  const q = e.request.url.query()
  if (!v.verificar(id, size, q.get('exp'), q.get('sig'))) return e.json(403, { message: 'Enlace vencido o inválido.' })
  let r
  try {
    r = e.app.findRecordById('product_renders', id)
  } catch (_) {
    return e.json(404, { message: 'No existe.' })
  }
  const name = r.getString(`img_${size}`)
  const fs = e.app.newFilesystem()
  try {
    e.response.header().set('Cache-Control', 'private, max-age=600')
    e.response.header().set('X-Robots-Tag', 'noindex')
    fs.serve(e.response, e.request, `${r.baseFilesPath()}/${name}`, name)
  } finally {
    fs.close()
  }
})

// View (once per device and day, enforced by a unique index) and WhatsApp click counters.
routerAdd('POST', '/api/visor/evento', (e) => {
  const v = require(`${__hooks}/lib/visor.js`)
  if (v.BOTS.test(e.request.header.get('User-Agent') || '')) return e.noContent(204)
  const body = e.requestInfo().body || {}
  const kind = body.kind === 'click' ? 'click' : body.kind === 'view' ? 'view' : ''
  const cat = v.publicado(String(body.slug || ''))
  if (!kind || !cat) return e.noContent(204)
  const ev = new Record(e.app.findCollectionByNameOrId('events'))
  ev.set('kind', kind)
  ev.set('catalog', cat.id)
  ev.set('day', v.dia())
  ev.set('device', String(body.device || '').slice(0, 64))
  if (kind === 'click') {
    try {
      const p = e.app.findRecordById('products', String(body.product || ''))
      if (p.getString('catalog') !== cat.id) return e.noContent(204)
      ev.set('product', p.id)
    } catch (_) {
      return e.noContent(204)
    }
    ev.set('color', String(body.color || '').slice(0, 60))
    ev.set('size', String(body.size || '').slice(0, 20))
  }
  try {
    e.app.save(ev)
  } catch (_) {
    // duplicate view for this device and day: already counted
  }
  return e.noContent(204)
})

// Open Graph tags for link previews (WhatsApp, redes): the SPA's index.html with meta tags.
routerAdd('GET', '/c/{slug}', (e) => {
  const v = require(`${__hooks}/lib/visor.js`)
  const html = v.indexConMeta(e, v.publicado(e.request.pathValue('slug')))
  if (html === null) return e.json(404, { message: 'Sin index.html' })
  return e.html(200, html)
})

routerAdd('GET', '/{$}', (e) => {
  const v = require(`${__hooks}/lib/visor.js`)
  const html = v.indexConMeta(e, v.publicado(''))
  if (html === null) return e.json(404, { message: 'Sin index.html' })
  return e.html(200, html)
})
