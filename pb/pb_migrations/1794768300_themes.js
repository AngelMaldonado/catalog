/// <reference path="../../pb_data/types.d.ts" />
// Seed themes with their page backgrounds (pb/seed/themes/<slug>/<page>.webp, made with
// pb/tools/themes.mjs; provenance in each PROVENANCE.md). Updates «Genérico» (created by the
// first seed without art) and creates «Navidad» and «Día de Muertos».
// Palette and fonts mirror THEMES in pb/tools/themes.mjs (also written to themes/themes.json).

const SEED = $os.getenv('CATALOG_SEED_DIR') || 'pb/seed'
const PAGES = ['cover', 'divider', 'products', 'promo', 'back', 'filler']

const THEMES = {
  generico: {
    name: 'Genérico', season: 'Todo el año', sort: 1,
    palette: { background: '#f4efe6', ink: '#2a2118', accent: '#b0643a' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif' },
  },
  navidad: {
    name: 'Navidad', season: 'Diciembre', sort: 2,
    palette: { background: '#f6efe3', ink: '#2b1416', accent: '#8e1b22' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif' },
  },
  muertos: {
    name: 'Día de Muertos', season: 'Octubre–noviembre', sort: 3,
    palette: { background: '#1d1430', ink: '#fbefe0', accent: '#f08c00' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif' },
  },
}

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
      r.set('fonts', t.fonts)
      r.set('sort', t.sort)
      for (const page of PAGES) r.set(`bg_${page}`, $filesystem.fileFromPath(`${SEED}/themes/${slug}/${page}.webp`))
      app.save(r)
    }
  },
  (app) => {
    for (const slug of ['navidad', 'muertos']) {
      try {
        app.delete(app.findFirstRecordByData('themes', 'slug', slug))
      } catch (_) {}
    }
    const g = app.findFirstRecordByData('themes', 'slug', 'generico')
    for (const page of PAGES) g.set(`bg_${page}`, null)
    app.save(g)
  },
)
