/// <reference path="../../pb_data/types.d.ts" />
// Share image (Open Graph, 1200×630) generated from the cover when the catalog is published.
// The server injects it in the meta tags for /c/<slug> and / (thread «Visor público»).

migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('catalogs')
    c.fields.add(new FileField({ name: 'og_image', maxSelect: 1, maxSize: 2 * 1024 * 1024, mimeTypes: ['image/jpeg', 'image/webp', 'image/png'] }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('catalogs')
    c.fields.removeByName('og_image')
    app.save(c)
  },
)
