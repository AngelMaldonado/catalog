/// <reference path="../../pb_data/types.d.ts" />
// Catalog look (threads «Editor de portada» and «Control creativo»):
//   title_font         font of the catalog title (web/src/lib/fuentes.ts ids); empty = the theme's
//   product_highlight  what sits behind each product now that pages have no card: glow (default
//                      when empty), disc, shadow, ring or none (web/src/catalogo/pintar.ts)

migrate(
  (app) => {
    const c = app.findCollectionByNameOrId('catalogs')
    c.fields.add(new TextField({ name: 'title_font', max: 40 }))
    c.fields.add(new SelectField({ name: 'product_highlight', maxSelect: 1, values: ['brillo', 'disco', 'sombra', 'aro', 'ninguno'] }))
    app.save(c)
  },
  (app) => {
    const c = app.findCollectionByNameOrId('catalogs')
    c.fields.removeByName('title_font')
    c.fields.removeByName('product_highlight')
    app.save(c)
  },
)
