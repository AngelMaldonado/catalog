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
  // Efemérides comunes en México. `fonts.fuente`: fuente del título por defecto (id de
  // web/src/lib/fuentes.ts) para los catálogos de ese tema que no elijan otra.
  sanvalentin: {
    name: 'Día del Amor y la Amistad',
    season: 'Febrero',
    palette: { background: '#fbeef0', ink: '#4a1424', accent: '#d3264f' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif', fuente: 'pacifico' },
    motif: "Mexican Día del Amor y la Amistad (Valentine's Day, February 14): romantic and joyful; red and pink hearts, roses, peonies and tulips, blank love-letter envelopes, satin ribbons, soft confetti; blush pink and deep red on a cream base; sweet but elegant, not childish.",
  },
  mujer: {
    name: '8M · Día de la Mujer',
    season: 'Marzo',
    palette: { background: '#f3eef7', ink: '#2e1640', accent: '#7b2d9b' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif', fuente: 'abril' },
    motif: "International Women's Day (8M) in Mexico: empowering, artistic and respectful, with no slogans, signs or symbols; purple and green as the main colors (the colors associated with 8M in Mexico), violet, lavender and sage; jacaranda blossoms, violets, eucalyptus and wild botanicals, abstract organic shapes and soft painterly brushstrokes; elegant and strong.",
  },
  ninos: {
    name: 'Día del Niño',
    season: 'Abril',
    palette: { background: '#fff7e6', ink: '#1f2a44', accent: '#ff6b35' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif', fuente: 'bangers' },
    motif: 'Mexican Día del Niño (April 30): playful and colorful; traditional Mexican toys (balero, trompo, papalotes kites, canicas marbles, lotería-style shapes without text), balloons, paper planes and confetti; bright primary and candy colors on a light warm base; fun and clean, not cluttered.',
  },
  madres: {
    name: 'Día de las Madres',
    season: 'Mayo',
    palette: { background: '#fdf1f3', ink: '#4b2236', accent: '#c2577a' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif', fuente: 'lobster' },
    motif: 'Mexican Día de las Madres (May 10): tender and elegant; soft pink, coral and cream; roses, carnations and peonies, delicate silk ribbons, watercolor textures, small gift boxes; warm, loving and refined.',
  },
  padre: {
    name: 'Día del Padre',
    season: 'Junio',
    palette: { background: '#d9b98a', ink: '#1c2a3a', accent: '#2f5d8a' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif', fuente: 'abril' },
    motif: "Father's Day in Mexico (third Sunday of June): classic warm style; navy blue, cognac leather, kraft paper and denim textures, subtle plaid, neckties, vintage pocket watch, coffee and workshop details; refined and simple.",
  },
  patrias: {
    name: 'Fiestas Patrias',
    season: 'Septiembre',
    palette: { background: '#f7f4ec', ink: '#1f2a20', accent: '#c8102e' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif', fuente: 'shrikhand' },
    motif: 'Mexican Fiestas Patrias in September: festive and proud in green, white and red, WITHOUT the national flag, coat of arms or eagle (they cannot be used commercially); tricolor papel picado banners, red and green chiles, corn husks, maguey and nopal plants, talavera tile patterns, tricolor confetti; vibrant but elegant.',
  },
  halloween: {
    name: 'Halloween',
    season: 'Octubre',
    palette: { background: '#1a1222', ink: '#fff3e6', accent: '#ff7a00' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif', fuente: 'creepster' },
    motif: "Halloween (October 31), spooky-cute and stylish, never gory or truly scary, and clearly different from Día de Muertos (no sugar skulls, no marigolds, no papel picado): carved jack-o'-lanterns with warm glow, bats, full moon, spider webs, wrapped candy, black cats, witch hats; deep purple-black night base with vibrant orange and lime accents.",
  },
  buenfin: {
    name: 'El Buen Fin',
    season: 'Noviembre',
    palette: { background: '#fff4e0', ink: '#1f1b16', accent: '#e63312' },
    fonts: { title: 'Georgia, serif', body: 'system-ui, sans-serif', fuente: 'bungee' },
    motif: 'Big seasonal sale (El Buen Fin, Mexico, November): energetic modern retail look; bold red, warm yellow and white; shopping bags, gift boxes, blank price-tag shapes (no numbers), dynamic bursts and confetti; clean and graphic.',
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
