/// <reference path="../../pb_data/types.d.ts" />
// Themes for the most common Mexican holidays (thread «Control creativo»), with their page
// backgrounds (pb/seed/themes/<slug>/<page>.webp, made with Codex CLI and pb/tools/themes.mjs;
// provenance in each PROVENANCE.md). Palette and fonts mirror THEMES in pb/tools/themes.mjs.
// fonts.fuente is the default title font (web/src/lib/fuentes.ts) for catalogs that pick none.
// All themes are re-sorted by the calendar: «Genérico» first, then February → December.

const SEED = $os.getenv('CATALOG_SEED_DIR') || 'pb/seed'
const PAGES = ['cover', 'divider', 'products', 'promo', 'back', 'filler']
const BASE = { title: 'Georgia, serif', body: 'system-ui, sans-serif' }

const THEMES = {
  sanvalentin: { name: 'Día del Amor y la Amistad', season: 'Febrero', palette: { background: '#fbeef0', ink: '#4a1424', accent: '#d3264f' }, fuente: 'pacifico' },
  mujer: { name: '8M · Día de la Mujer', season: 'Marzo', palette: { background: '#f3eef7', ink: '#2e1640', accent: '#7b2d9b' }, fuente: 'abril' },
  ninos: { name: 'Día del Niño', season: 'Abril', palette: { background: '#fff7e6', ink: '#1f2a44', accent: '#ff6b35' }, fuente: 'bangers' },
  madres: { name: 'Día de las Madres', season: 'Mayo', palette: { background: '#fdf1f3', ink: '#4b2236', accent: '#c2577a' }, fuente: 'lobster' },
  padre: { name: 'Día del Padre', season: 'Junio', palette: { background: '#d9b98a', ink: '#1c2a3a', accent: '#2f5d8a' }, fuente: 'abril' },
  patrias: { name: 'Fiestas Patrias', season: 'Septiembre', palette: { background: '#f7f4ec', ink: '#1f2a20', accent: '#c8102e' }, fuente: 'shrikhand' },
  halloween: { name: 'Halloween', season: 'Octubre', palette: { background: '#1a1222', ink: '#fff3e6', accent: '#ff7a00' }, fuente: 'creepster' },
  buenfin: { name: 'El Buen Fin', season: 'Noviembre', palette: { background: '#fff4e0', ink: '#1f1b16', accent: '#e63312' }, fuente: 'bungee' },
}
const ORDEN = ['generico', 'sanvalentin', 'mujer', 'ninos', 'madres', 'padre', 'patrias', 'halloween', 'muertos', 'buenfin', 'navidad']

migrate(
  (app) => {
    const themes = app.findCollectionByNameOrId('themes')
    for (const [slug, t] of Object.entries(THEMES)) {
      let r
      try {
        r = app.findFirstRecordByData('themes', 'slug', slug)
      } catch (_) {
        r = new Record(themes)
        r.set('slug', slug)
      }
      r.set('name', t.name)
      r.set('season', t.season)
      r.set('palette', t.palette)
      r.set('fonts', { ...BASE, fuente: t.fuente })
      for (const page of PAGES) r.set(`bg_${page}`, $filesystem.fileFromPath(`${SEED}/themes/${slug}/${page}.webp`))
      app.save(r)
    }
    ORDEN.forEach((slug, i) => {
      try {
        const r = app.findFirstRecordByData('themes', 'slug', slug)
        r.set('sort', i + 1)
        app.save(r)
      } catch (_) {}
    })
  },
  (app) => {
    for (const slug of Object.keys(THEMES)) {
      try {
        app.delete(app.findFirstRecordByData('themes', 'slug', slug))
      } catch (_) {}
    }
    ;['generico', 'navidad', 'muertos'].forEach((slug, i) => {
      const r = app.findFirstRecordByData('themes', 'slug', slug)
      r.set('sort', i + 1)
      app.save(r)
    })
  },
)
