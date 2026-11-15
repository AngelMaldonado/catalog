/// <reference path="../../pb_data/types.d.ts" />
// Garment template assets made by pb/tools/garments.mjs (thread «Temas iniciales»):
//   mask    {kind}-mask.png     alpha of the garment
//   shadow  {kind}-shading.png  luminance normalised to the fabric's white; multiply it over
//                               a tint or a design to keep folds and texture
// and the exact print areas (normalised quads, same numbers as PRINT_AREAS in that script).

const SEED = $os.getenv('CATALOG_SEED_DIR') || 'pb/seed'

const PRINT_AREAS = {
  tshirt: [[0.374, 0.21], [0.626, 0.21], [0.626, 0.546], [0.374, 0.546]],
  hoodie: [[0.385, 0.35], [0.615, 0.35], [0.615, 0.58], [0.385, 0.58]],
  cap: [[0.36, 0.27], [0.64, 0.27], [0.665, 0.52], [0.335, 0.52]],
}

migrate(
  (app) => {
    for (const kind of Object.keys(PRINT_AREAS)) {
      const r = app.findFirstRecordByData('garment_templates', 'kind', kind)
      r.set('mask', $filesystem.fileFromPath(`${SEED}/garments/${kind}-mask.png`))
      r.set('shadow', $filesystem.fileFromPath(`${SEED}/garments/${kind}-shading.png`))
      r.set('print_area', PRINT_AREAS[kind])
      app.save(r)
    }
  },
  (app) => {
    for (const kind of Object.keys(PRINT_AREAS)) {
      const r = app.findFirstRecordByData('garment_templates', 'kind', kind)
      r.set('mask', null)
      r.set('shadow', null)
      app.save(r)
    }
  },
)
