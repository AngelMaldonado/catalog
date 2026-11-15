/// <reference path="../../pb_data/types.d.ts" />
// Base data every installation starts with: categories, the bundled garment templates
// (photos generated with Codex CLI, see pb/seed/garments/PROVENANCE.md), a generic test theme
// and the single settings record. Files are read from $CATALOG_SEED_DIR (default ./pb/seed).
//
// Print areas are APPROXIMATE (estimated on the photos); masks, shadow maps and exact quads
// are made by hand in thread «Temas iniciales» and loaded by a later migration.

const SEED = $os.getenv('CATALOG_SEED_DIR') || 'pb/seed'

const COLORS = [
  { name: 'Blanco', hex: '#ffffff' },
  { name: 'Negro', hex: '#1d1d1f' },
  { name: 'Gris jaspeado', hex: '#9ea3a8' },
  { name: 'Rojo', hex: '#b3212d' },
  { name: 'Verde bosque', hex: '#24452f' },
  { name: 'Azul marino', hex: '#1f2a44' },
  { name: 'Arena', hex: '#d8c7a8' },
]

const TEMPLATES = [
  {
    name: 'Playera', kind: 'tshirt', file: 'tshirt-front-white.png', category: 'Playeras', price: 350, sort: 1,
    sizes: ['CH', 'M', 'G', 'XG'],
    print_area: [[0.35, 0.27], [0.65, 0.27], [0.65, 0.6], [0.35, 0.6]],
  },
  {
    name: 'Sudadera', kind: 'hoodie', file: 'hoodie-front-white.png', category: 'Sudaderas', price: 650, sort: 2,
    sizes: ['CH', 'M', 'G', 'XG'],
    print_area: [[0.37, 0.3], [0.63, 0.3], [0.63, 0.56], [0.37, 0.56]],
  },
  {
    name: 'Gorra', kind: 'cap', file: 'cap-front-white.png', category: 'Gorras', price: 280, sort: 3,
    sizes: ['Unitalla'],
    print_area: [[0.36, 0.2], [0.64, 0.2], [0.62, 0.5], [0.38, 0.5]],
  },
]

migrate(
  (app) => {
    const categories = app.findCollectionByNameOrId('categories')
    TEMPLATES.forEach((t) => {
      const r = new Record(categories)
      r.set('name', t.category)
      r.set('sort', t.sort)
      app.save(r)
    })

    const templates = app.findCollectionByNameOrId('garment_templates')
    TEMPLATES.forEach((t) => {
      const r = new Record(templates)
      r.set('name', t.name)
      r.set('kind', t.kind)
      r.set('base', $filesystem.fileFromPath(`${SEED}/garments/${t.file}`))
      r.set('print_area', t.print_area)
      r.set('colors', t.kind === 'cap' ? COLORS.filter((c) => c.name !== 'Gris jaspeado') : COLORS)
      r.set('sizes', t.sizes)
      r.set('base_price', t.price)
      r.set('category_name', t.category)
      r.set('sort', t.sort)
      app.save(r)
    })

    const themes = app.findCollectionByNameOrId('themes')
    const theme = new Record(themes)
    theme.set('name', 'Genérico')
    theme.set('slug', 'generico')
    theme.set('season', 'Todo el año')
    theme.set('palette', { background: '#f4efe6', ink: '#2a2118', accent: '#8a5a2b' })
    theme.set('fonts', { title: 'Georgia, serif', body: 'system-ui, sans-serif' })
    theme.set('sort', 1)
    app.save(theme)

    const settings = app.findCollectionByNameOrId('settings')
    const s = new Record(settings)
    s.set('business_name', 'Mi negocio')
    s.set('currency', 'MXN')
    app.save(s)
  },
  (app) => {
    for (const name of ['settings', 'themes', 'garment_templates', 'categories']) {
      const c = app.findCollectionByNameOrId(name)
      app.findAllRecords(c).forEach((r) => app.delete(r))
    }
  },
)
