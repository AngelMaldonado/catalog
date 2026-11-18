/// <reference path="../../pb_data/types.d.ts" />
// Ya no hay «catálogo vigente»: todos los catálogos viven en /c/<slug> y la raíz lista los
// publicados. Se quita settings.current_catalog.

migrate(
  (app) => {
    const s = app.findCollectionByNameOrId('settings')
    s.fields.removeByName('current_catalog')
    app.save(s)
  },
  (app) => {
    const s = app.findCollectionByNameOrId('settings')
    const catalogs = app.findCollectionByNameOrId('catalogs')
    s.fields.add(new RelationField({ name: 'current_catalog', maxSelect: 1, collectionId: catalogs.id, cascadeDelete: false }))
    app.save(s)
  },
)
