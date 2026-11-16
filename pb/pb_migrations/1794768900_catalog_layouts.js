/// <reference path="../../pb_data/types.d.ts" />
// Editable cover and share image (threads «Editor de portada» and «Imagen para redes que vende»):
//   cover_layout  {elementos, subtitulo, productos}: positioned elements painted on the cover;
//                 empty = the classic cover
//   og_layout     {plantilla, esquinaLogo, posTitulo, productos, precio, elementos}: how the
//                 Open Graph image is composed; empty = the default template
// Both are described and painted by web/src/catalogo/lienzo.ts.

migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('catalogs')
    c.fields.add(new JSONField({ name: 'cover_layout', maxSize: 20000 }))
    c.fields.add(new JSONField({ name: 'og_layout', maxSize: 20000 }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('catalogs')
    c.fields.removeByName('cover_layout')
    c.fields.removeByName('og_layout')
    app.save(c)
  },
)
