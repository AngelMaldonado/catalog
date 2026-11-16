/// <reference path="../../pb_data/types.d.ts" />
// Variants of one garment (thread «Sudadera con y sin gorro como variante»): the hoodie sells
// with and without a hood, and the customer picks in the product sheet.
//
//   garment_templates.variant_of    the main template this one is a variant of (empty: main)
//   garment_templates.variant_name  how the customer sees it («Con gorro», «Sin gorro»)
//   products.variants               the templates offered for this product (main + variants);
//                                   empty = only the product's template
//   product_renders.template        which variant the render shows (empty = the product's
//                                   template); unique per (product, color, template)
//
// The crewneck («Sin gorro») is a new template whose assets come from pb/tools/garments.mjs
// (crewneck-front-white / -mask / -shading); colors, sizes, price and category copy the hoodie.

const SEED = $os.getenv('CATALOG_SEED_DIR') || 'pb/seed'
const CREWNECK_AREA = [[0.34, 0.22], [0.66, 0.22], [0.66, 0.62], [0.34, 0.62]]

migrate(
  (app) => {
    const templates = app.findCollectionByNameOrId('garment_templates')
    templates.fields.getByName('kind').values = ['tshirt', 'hoodie', 'crewneck', 'cap']
    templates.fields.add(new RelationField({ name: 'variant_of', maxSelect: 1, collectionId: templates.id, cascadeDelete: false }))
    templates.fields.add(new TextField({ name: 'variant_name', max: 40 }))
    app.save(templates)

    const products = app.findCollectionByNameOrId('products')
    products.fields.add(new RelationField({ name: 'variants', maxSelect: 10, collectionId: templates.id, cascadeDelete: false }))
    app.save(products)

    const renders = app.findCollectionByNameOrId('product_renders')
    renders.fields.add(new RelationField({ name: 'template', maxSelect: 1, collectionId: templates.id, cascadeDelete: false }))
    renders.indexes = ['CREATE UNIQUE INDEX idx_renders_product_color_template ON product_renders (product, color, template)']
    app.save(renders)

    const hoodie = app.findFirstRecordByData('garment_templates', 'kind', 'hoodie')
    hoodie.set('variant_name', 'Con gorro')
    app.save(hoodie)

    const crew = new Record(templates)
    crew.set('name', 'Sudadera sin gorro')
    crew.set('kind', 'crewneck')
    crew.set('base', $filesystem.fileFromPath(`${SEED}/garments/crewneck-front-white.png`))
    crew.set('mask', $filesystem.fileFromPath(`${SEED}/garments/crewneck-mask.png`))
    crew.set('shadow', $filesystem.fileFromPath(`${SEED}/garments/crewneck-shading.png`))
    crew.set('print_area', CREWNECK_AREA)
    for (const f of ['colors', 'sizes', 'base_price', 'category_name', 'sort']) crew.set(f, hoodie.get(f))
    crew.set('variant_of', hoodie.id)
    crew.set('variant_name', 'Sin gorro')
    app.save(crew)
  },
  (app) => {
    try {
      app.delete(app.findFirstRecordByData('garment_templates', 'kind', 'crewneck'))
    } catch (_) {}
    const renders = app.findCollectionByNameOrId('product_renders')
    renders.indexes = ['CREATE UNIQUE INDEX idx_renders_product_color ON product_renders (product, color)']
    renders.fields.removeByName('template')
    app.save(renders)
    const products = app.findCollectionByNameOrId('products')
    products.fields.removeByName('variants')
    app.save(products)
    const templates = app.findCollectionByNameOrId('garment_templates')
    templates.fields.removeByName('variant_of')
    templates.fields.removeByName('variant_name')
    templates.fields.getByName('kind').values = ['tshirt', 'hoodie', 'cap']
    app.save(templates)
  },
)
