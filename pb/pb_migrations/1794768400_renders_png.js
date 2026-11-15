/// <reference path="../../pb_data/types.d.ts" />
// Renders are encoded in the browser with canvas.toBlob('image/webp'); a browser that cannot
// encode WebP silently returns PNG. Accept PNG too so the upload does not fail there.

migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('product_renders')
    for (const name of ['img_480', 'img_960']) c.fields.getByName(name).mimeTypes = ['image/webp', 'image/png']
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('product_renders')
    for (const name of ['img_480', 'img_960']) c.fields.getByName(name).mimeTypes = ['image/webp']
    app.save(c)
  },
)
