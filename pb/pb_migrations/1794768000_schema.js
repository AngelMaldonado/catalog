/// <reference path="../../pb_data/types.d.ts" />
// Catalog schema (thread «Base del repo y esquema»).
// Access model: the public reads only what belongs to a published catalog; writing needs a record
// of `users` (the business, 1–3 accounts); `designs` (original artwork) is never public;
// `product_renders` files are served only through signed URLs (thread «Visor público»).

const AUTH = '@request.auth.collectionName = "users"'
const PUBLISHED_OR_AUTH = (path) => `${path}status = "published" || ${AUTH}`
const IMG = ['image/png', 'image/jpeg', 'image/webp', 'image/avif']
const MB = 1024 * 1024

const autodates = () => [
  { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
  { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
]
const image = (name, opts = {}) => ({ name, type: 'file', maxSelect: 1, maxSize: 10 * MB, mimeTypes: IMG, ...opts })
const PAGE_BACKGROUNDS = ['cover', 'divider', 'products', 'promo', 'back', 'filler']

migrate(
  (app) => {
    // ---- users: the business accounts --------------------------------------
    const users = app.findCollectionByNameOrId('users')
    users.listRule = 'id = @request.auth.id'
    users.viewRule = 'id = @request.auth.id'
    users.createRule = null
    users.updateRule = 'id = @request.auth.id'
    users.deleteRule = null
    app.save(users)

    const save = (def) => {
      const c = new Collection(def)
      app.save(c)
      return app.findCollectionByNameOrId(def.name)
    }

    // ---- categories (free, one per product, reused across seasons) -----------
    const categories = save({
      type: 'base',
      name: 'categories',
      listRule: '',
      viewRule: '',
      createRule: AUTH,
      updateRule: AUTH,
      deleteRule: AUTH,
      fields: [
        { name: 'name', type: 'text', required: true, max: 60 },
        { name: 'sort', type: 'number', onlyInt: true },
        ...autodates(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_categories_name ON categories (name)'],
    })

    // ---- garment templates (bundled set; editable later by an editor) --------
    const templates = save({
      type: 'base',
      name: 'garment_templates',
      listRule: AUTH,
      viewRule: AUTH,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, max: 60 },
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['tshirt', 'hoodie', 'cap'] },
        image('base', { required: true, maxSize: 20 * MB }),
        image('mask', { maxSize: 20 * MB }),
        image('shadow', { maxSize: 20 * MB }),
        // print area: quad in normalised image coords [[x,y] top-left, top-right, bottom-right, bottom-left]
        { name: 'print_area', type: 'json', required: true, maxSize: 2000 },
        // [{ "name": "Negro", "hex": "#1d1d1f" }, ...]
        { name: 'colors', type: 'json', required: true, maxSize: 20000 },
        // ["S", "M", "L", "XL"]
        { name: 'sizes', type: 'json', required: true, maxSize: 2000 },
        { name: 'base_price', type: 'number', required: true, min: 0 },
        { name: 'category_name', type: 'text', max: 60 }, // default category for new products
        { name: 'sort', type: 'number', onlyInt: true },
        ...autodates(),
      ],
    })

    // ---- themes (bundled season art; the catalog may override backgrounds) ---
    const themes = save({
      type: 'base',
      name: 'themes',
      listRule: '',
      viewRule: '',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'name', type: 'text', required: true, max: 60 },
        { name: 'slug', type: 'text', required: true, max: 40, pattern: '^[a-z0-9-]+$' },
        { name: 'season', type: 'text', max: 60 },
        // { "background": "#...", "ink": "#...", "accent": "#..." }
        { name: 'palette', type: 'json', maxSize: 2000 },
        // { "title": "Georgia", "body": "system-ui" }
        { name: 'fonts', type: 'json', maxSize: 2000 },
        ...PAGE_BACKGROUNDS.map((p) => image(`bg_${p}`)),
        { name: 'sort', type: 'number', onlyInt: true },
        ...autodates(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_themes_slug ON themes (slug)'],
    })

    // ---- catalogs (one per season) -------------------------------------------
    const catalogs = save({
      type: 'base',
      name: 'catalogs',
      listRule: PUBLISHED_OR_AUTH(''),
      viewRule: PUBLISHED_OR_AUTH(''),
      createRule: AUTH,
      updateRule: AUTH,
      deleteRule: AUTH,
      fields: [
        { name: 'name', type: 'text', required: true, max: 80 },
        { name: 'slug', type: 'text', required: true, max: 60, pattern: '^[a-z0-9-]+$' },
        { name: 'status', type: 'select', required: true, maxSelect: 1, values: ['draft', 'published'] },
        { name: 'theme', type: 'relation', required: true, maxSelect: 1, collectionId: themes.id, cascadeDelete: false },
        // page turn chosen by the admin: rigid (CSS 3D leaves) | realistic (WebGL curl)
        { name: 'page_turn', type: 'select', required: true, maxSelect: 1, values: ['rigid', 'realistic'] },
        // products per page in automatic layout
        { name: 'layout', type: 'select', required: true, maxSelect: 1, values: ['1', '2', '4'] },
        // ordered category ids used by this catalog
        { name: 'category_order', type: 'json', maxSize: 20000 },
        ...PAGE_BACKGROUNDS.map((p) => image(`bg_${p}`)), // overrides of the theme backgrounds
        ...autodates(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_catalogs_slug ON catalogs (slug)'],
    })

    // ---- settings (single record: the business) --------------------------------
    save({
      type: 'base',
      name: 'settings',
      listRule: '',
      viewRule: '',
      createRule: null, // created by the seed; there is exactly one
      updateRule: AUTH,
      deleteRule: null,
      fields: [
        { name: 'business_name', type: 'text', required: true, max: 80 },
        image('logo', { maxSize: 5 * MB, mimeTypes: [...IMG, 'image/svg+xml'] }),
        { name: 'whatsapp', type: 'text', max: 20, pattern: '^\\+?[0-9 ]*$' },
        { name: 'instagram', type: 'url' },
        { name: 'facebook', type: 'url' },
        { name: 'tiktok', type: 'url' },
        { name: 'address', type: 'text', max: 200 },
        { name: 'currency', type: 'text', required: true, max: 3, pattern: '^[A-Z]{3}$' },
        { name: 'current_catalog', type: 'relation', maxSelect: 1, collectionId: catalogs.id, cascadeDelete: false },
        ...autodates(),
      ],
    })

    // ---- designs (original artwork: protected, never public) ------------------
    const designs = save({
      type: 'base',
      name: 'designs',
      listRule: AUTH,
      viewRule: AUTH,
      createRule: AUTH,
      updateRule: AUTH,
      deleteRule: AUTH,
      fields: [
        { name: 'catalog', type: 'relation', required: true, maxSelect: 1, collectionId: catalogs.id, cascadeDelete: true },
        { name: 'name', type: 'text', required: true, max: 80 },
        { name: 'file', type: 'file', required: true, maxSelect: 1, maxSize: 30 * MB, mimeTypes: ['image/png', 'image/webp'], protected: true },
        { name: 'width', type: 'number', onlyInt: true, min: 0 },
        { name: 'height', type: 'number', onlyInt: true, min: 0 },
        ...autodates(),
      ],
    })

    // ---- products = design × garment; colors are variants -----------------------
    const products = save({
      type: 'base',
      name: 'products',
      listRule: PUBLISHED_OR_AUTH('catalog.'),
      viewRule: PUBLISHED_OR_AUTH('catalog.'),
      createRule: AUTH,
      updateRule: AUTH,
      deleteRule: AUTH,
      fields: [
        { name: 'catalog', type: 'relation', required: true, maxSelect: 1, collectionId: catalogs.id, cascadeDelete: true },
        { name: 'design', type: 'relation', required: true, maxSelect: 1, collectionId: designs.id, cascadeDelete: true },
        { name: 'template', type: 'relation', required: true, maxSelect: 1, collectionId: templates.id, cascadeDelete: false },
        { name: 'category', type: 'relation', maxSelect: 1, collectionId: categories.id, cascadeDelete: false },
        { name: 'name', type: 'text', required: true, max: 80 },
        { name: 'price', type: 'number', required: true, min: 0 },
        // { "x": 0.5, "y": 0.4, "scale": 0.8, "rotation": 0 } inside the print area
        { name: 'placement', type: 'json', required: true, maxSize: 2000 },
        // color names picked from the template, in display order
        { name: 'colors', type: 'json', required: true, maxSize: 5000 },
        { name: 'sizes', type: 'json', maxSize: 2000 },
        { name: 'sort', type: 'number', onlyInt: true },
        ...autodates(),
      ],
    })

    // ---- product renders (one per color; files only via signed URLs) -----------
    save({
      type: 'base',
      name: 'product_renders',
      listRule: AUTH,
      viewRule: AUTH,
      createRule: AUTH,
      updateRule: AUTH,
      deleteRule: AUTH,
      fields: [
        { name: 'product', type: 'relation', required: true, maxSelect: 1, collectionId: products.id, cascadeDelete: true },
        { name: 'color', type: 'text', required: true, max: 60 },
        { name: 'img_480', type: 'file', required: true, maxSelect: 1, maxSize: 2 * MB, mimeTypes: ['image/webp'], protected: true },
        { name: 'img_960', type: 'file', required: true, maxSelect: 1, maxSize: 4 * MB, mimeTypes: ['image/webp'], protected: true },
        ...autodates(),
      ],
      indexes: ['CREATE UNIQUE INDEX idx_renders_product_color ON product_renders (product, color)'],
    })

    // ---- special pages inserted by the admin (promo, full image) ---------------
    save({
      type: 'base',
      name: 'pages',
      listRule: PUBLISHED_OR_AUTH('catalog.'),
      viewRule: PUBLISHED_OR_AUTH('catalog.'),
      createRule: AUTH,
      updateRule: AUTH,
      deleteRule: AUTH,
      fields: [
        { name: 'catalog', type: 'relation', required: true, maxSelect: 1, collectionId: catalogs.id, cascadeDelete: true },
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['promo', 'image'] },
        { name: 'title', type: 'text', max: 80 },
        { name: 'body', type: 'text', max: 400 },
        image('image'),
        // position in the automatic sequence: the page is inserted before this index
        { name: 'position', type: 'number', required: true, onlyInt: true, min: 0 },
        ...autodates(),
      ],
    })

    // ---- events (view/click counters; written only by a server hook) -----------
    save({
      type: 'base',
      name: 'events',
      listRule: AUTH,
      viewRule: AUTH,
      createRule: null,
      updateRule: null,
      deleteRule: null,
      fields: [
        { name: 'kind', type: 'select', required: true, maxSelect: 1, values: ['view', 'click'] },
        { name: 'catalog', type: 'relation', required: true, maxSelect: 1, collectionId: catalogs.id, cascadeDelete: true },
        { name: 'product', type: 'relation', maxSelect: 1, collectionId: products.id, cascadeDelete: true },
        { name: 'color', type: 'text', max: 60 },
        { name: 'size', type: 'text', max: 20 },
        { name: 'day', type: 'text', required: true, max: 10, pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        { name: 'device', type: 'text', max: 64 },
        ...autodates(),
      ],
      indexes: [
        'CREATE INDEX idx_events_catalog_day ON events (catalog, day)',
        'CREATE UNIQUE INDEX idx_events_view_once ON events (catalog, device, day) WHERE kind = \'view\'',
      ],
    })
  },
  (app) => {
    for (const name of ['events', 'pages', 'product_renders', 'products', 'designs', 'settings', 'catalogs', 'themes', 'garment_templates', 'categories']) {
      try {
        app.delete(app.findCollectionByNameOrId(name))
      } catch (_) {}
    }
  },
)
