/// <reference path="../../pb_data/types.d.ts" />
// Editable back cover (thread «Editor de portada»): same model as cover_layout
// ({elementos, subtitulo, productos}, painted by web/src/catalogo/lienzo.ts); here `subtitulo`
// is the free message and the title element carries the business name. Empty = the classic one.

migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('catalogs')
    c.fields.add(new JSONField({ name: 'back_layout', maxSize: 20000 }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('catalogs')
    c.fields.removeByName('back_layout')
    app.save(c)
  },
)
