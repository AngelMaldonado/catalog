// Theme art with the OpenAI Images API (thread «Temas iniciales»). Internal tool run by the
// operator; the business never sees it. Needs OPENAI_API_KEY in the environment or in the
// repo's gitignored .env (never committed, never passed on the command line).
//
//   node themes.mjs --dry-run                 list what would be generated and the prompts
//   node themes.mjs                           generate every missing image
//   node themes.mjs --theme navidad --page cover --force
//
//   node themes.mjs --prompts-json f.json     export the prompts for another generator (Codex CLI)
//   node themes.mjs --import <dir>            turn PNGs from <dir>/<slug>/<page>.png into seed files
//
// Output: pb/seed/themes/<slug>/<page>.webp at 1080×1920 (WebP q70), plus PROVENANCE.md with
// model, size, quality, date and the exact prompt of every file. Existing files are skipped
// unless --force. The seed migration loads them into the `themes` collection.
import sharp from 'sharp'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('../../', import.meta.url).pathname
const OUT = join(ROOT, 'pb/seed/themes')
const MODEL = 'gpt-image-2'
const SIZE = '1088x1920' // 9:16-ish, both sides divisible by 16; cropped to 1080×1920
const arg = (name) => {
  const i = process.argv.indexOf(`--${name}`)
  return i > 0 ? process.argv[i + 1] : undefined
}
const flag = (name) => process.argv.includes(`--${name}`)
const QUALITY = arg('quality') ?? 'high'

const STYLE = [
  'Premium seasonal background for one page of a mobile product catalog, portrait 9:16.',
  'Decorative elements only along the edges and corners; the central area (about 60% of the page) must stay calm, low-contrast and uncluttered so product photos and text can be placed on top of it.',
  'Absolutely no text, letters, numbers, logos, watermarks, signatures or people.',
  'High-end editorial quality, rich detail, soft cinematic light, cohesive with the other pages of the same set.',
].join(' ')

const PAGES = {
  cover: 'Cover page: the most festive and luxurious composition of the set, with an open area in the middle third for the catalog title.',
  divider: 'Section divider page: bold but simple, with a generous empty horizontal band across the center for a category name.',
  products: 'Product page: the quietest of the set, a soft paper or fabric texture with delicate ornaments only on the outer border; it must never compete with product photos.',
  promo: 'Promotion page: eye-catching and energetic, with a clear empty area in the center for a promotion headline.',
  back: 'Back cover: warm and calm closing page, with open space in the upper half for contact details.',
  filler: 'Filler page: a purely decorative, symmetric ornament page in harmony with the rest of the set.',
}

export const THEMES = {
  generico: {
    name: 'Genérico',
    season: 'Todo el año',
    palette: { background: '#f4efe6', ink: '#2a2118', accent: '#b0643a' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif' },
    motif: 'Year-round neutral style: warm natural linen and handmade paper textures, delicate botanical line art (olive branches, eucalyptus, wildflowers), terracotta and sage accents on a cream base, minimal and elegant.',
  },
  navidad: {
    name: 'Navidad',
    season: 'Diciembre',
    palette: { background: '#f6efe3', ink: '#2b1416', accent: '#8e1b22' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif' },
    motif: 'Christmas: deep red, pine green, antique gold and cream; pine and fir branches, glass ornaments, velvet ribbons, pine cones, warm golden bokeh lights and a touch of snow; cozy and luxurious, not cartoonish.',
  },
  muertos: {
    name: 'Día de Muertos',
    season: 'Octubre–noviembre',
    palette: { background: '#1d1430', ink: '#fbefe0', accent: '#f08c00' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif' },
    motif: 'Mexican Día de Muertos, festive and respectful (never scary or gory): cempasúchil marigold flowers in bright orange, papel picado banners in magenta, purple and orange, candles with warm glow, decorated sugar skulls with flowers, pan de muerto; deep night-blue and purple base with vibrant accents.',
  },
}

function loadKey() {
  if (process.env.OPENAI_API_KEY) return process.env.OPENAI_API_KEY
  const env = join(ROOT, '.env')
  if (existsSync(env)) {
    const m = readFileSync(env, 'utf8').match(/^OPENAI_API_KEY=(.+)$/m)
    if (m) return m[1].trim().replace(/^['"]|['"]$/g, '')
  }
  return null
}

async function generate(key, prompt) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, size: SIZE, quality: QUALITY, output_format: 'png', n: 1 }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`${res.status} ${body?.error?.message ?? JSON.stringify(body)}`)
  return Buffer.from(body.data[0].b64_json, 'base64')
}

const onlyTheme = arg('theme')
const onlyPage = arg('page')
const jobs = []
for (const [slug, t] of Object.entries(THEMES)) {
  if (onlyTheme && slug !== onlyTheme) continue
  for (const [page, direction] of Object.entries(PAGES)) {
    if (onlyPage && page !== onlyPage) continue
    const file = join(OUT, slug, `${page}.webp`)
    if (existsSync(file) && !flag('force')) continue
    jobs.push({ slug, page, file, prompt: `${STYLE} ${t.motif} ${direction}` })
  }
}

const date = new Date().toISOString().slice(0, 10)

/** Final seed file (1080×1920 WebP q70) plus its provenance entry. */
async function save(j, png, origin) {
  mkdirSync(join(OUT, j.slug), { recursive: true })
  await sharp(png).resize(1080, 1920, { fit: 'cover' }).webp({ quality: 70 }).toFile(j.file)
  const prov = join(OUT, j.slug, 'PROVENANCE.md')
  const head = existsSync(prov) ? readFileSync(prov, 'utf8') : `# Procedencia: tema «${THEMES[j.slug].name}»\n\nArte generado con IA de OpenAI y procesado con \`pb/tools/themes.mjs\` (recorte a 1080×1920, WebP q70). El contenido generado es de quien lo genera según los términos de uso de OpenAI.\n`
  writeFileSync(prov, `${head}\n## ${j.page}.webp\n\n- Fecha: ${date}\n- Origen: ${origin}\n- Prompt:\n\n\`\`\`text\n${j.prompt}\n\`\`\`\n`)
}
const writeThemesJson = () =>
  writeFileSync(join(OUT, 'themes.json'), JSON.stringify(Object.fromEntries(Object.entries(THEMES).map(([s, t]) => [s, { name: t.name, season: t.season, palette: t.palette, fonts: t.fonts }])), null, 2) + '\n')

// --prompts-json <file>: the jobs (with the raw PNG path to produce) for an external generator,
// e.g. Codex CLI, so the art direction stays identical to the API path.
const promptsJson = arg('prompts-json')
if (promptsJson) {
  const raw = join(OUT, '_raw')
  writeFileSync(promptsJson, JSON.stringify(jobs.map((j) => ({ slug: j.slug, page: j.page, prompt: j.prompt, png: join(raw, j.slug, `${j.page}.png`) })), null, 2))
  console.log(`${jobs.length} prompts → ${promptsJson}`)
  process.exit(0)
}

// --import <dir>: PNGs generated elsewhere (<dir>/<slug>/<page>.png, optional <dir>/manifest.json
// with { "<slug>/<page>": { "model": "...", "size": "...", "attempt": n } }) become seed files.
const importDir = arg('import')
if (importDir) {
  const manifestFile = join(importDir, 'manifest.json')
  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, 'utf8')) : {}
  let n = 0
  for (const j of jobs) {
    const png = join(importDir, j.slug, `${j.page}.png`)
    if (!existsSync(png)) continue
    const m = manifest[`${j.slug}/${j.page}`] ?? {}
    await save(j, readFileSync(png), `Codex CLI (herramienta image_gen)${m.model ? ` · modelo ${m.model}` : ''}${m.size ? ` · ${m.size}` : ''}${m.attempt ? ` · intento ${m.attempt}` : ''}`)
    console.log(`importado ${j.slug}/${j.page}`)
    n++
  }
  writeThemesJson()
  console.log(`${n} de ${jobs.length} importados`)
  process.exit(0)
}

// Default: generate with the OpenAI Images API (opt-in: needs the operator's token).
console.log(`${jobs.length} imágenes por generar (${MODEL}, ${SIZE}, quality=${QUALITY})`)
if (flag('dry-run')) {
  for (const j of jobs) console.log(`\n[${j.slug}/${j.page}]\n${j.prompt}`)
  process.exit(0)
}
const key = loadKey()
if (!key) {
  console.error('Falta OPENAI_API_KEY (entorno o .env en la raíz del repo, que está en .gitignore).')
  process.exit(1)
}
for (const j of jobs) {
  process.stdout.write(`→ ${j.slug}/${j.page} … `)
  await save(j, await generate(key, j.prompt), `API de imágenes de OpenAI · modelo ${MODEL} · ${SIZE} · calidad ${QUALITY}`)
  console.log('listo')
}
writeThemesJson()
