// Prepares spike images at production sizes and encodings (see thread «Mockups»):
//   backgrounds: 720x1280 + 1080x1920, WebP q70 (AVIF q50 also written for size comparison)
//   garments:    480 + 960 square, WebP q80
// Sources: public/bg/*.png (Codex placeholders) and ../../pb/seed/garments/*.png.
// When a source is missing, a noisy placeholder is generated so the spike keeps worst-case weight.
import sharp from 'sharp'
import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const here = new URL('..', import.meta.url).pathname
const out = join(here, 'public/img')
mkdirSync(out, { recursive: true })

const kb = (f) => (statSync(f).size / 1024).toFixed(0) + ' KB'
const report = []

async function placeholder(w, h, hue) {
  const noise = Buffer.alloc(w * h * 3)
  for (let i = 0; i < noise.length; i += 3) {
    const n = Math.random() * 60
    noise[i] = Math.min(255, hue[0] + n)
    noise[i + 1] = Math.min(255, hue[1] + n)
    noise[i + 2] = Math.min(255, hue[2] + n)
  }
  return sharp(noise, { raw: { width: w, height: h, channels: 3 } }).blur(1.2).png().toBuffer()
}

const backgrounds = {
  cover: [140, 20, 30],
  divider: [20, 70, 40],
  products: [200, 185, 160],
  back: [20, 25, 60],
}
for (const [name, hue] of Object.entries(backgrounds)) {
  const src = join(here, 'public/bg', `${name}.png`)
  const input = existsSync(src) ? src : await placeholder(1080, 1920, hue)
  for (const [w, h] of [[720, 1280], [1080, 1920]]) {
    const base = sharp(input).resize(w, h, { fit: 'cover' })
    const webp = join(out, `bg-${name}-${w}.webp`)
    const avif = join(out, `bg-${name}-${w}.avif`)
    await base.clone().webp({ quality: 70 }).toFile(webp)
    await base.clone().avif({ quality: 50 }).toFile(avif)
    report.push(`bg-${name}-${w}: webp ${kb(webp)}, avif ${kb(avif)}${existsSync(src) ? '' : ' (placeholder)'}`)
  }
}

for (const g of ['tshirt', 'hoodie', 'cap']) {
  const src = join(here, '../../pb/seed/garments', `${g}-front-white.png`)
  const input = existsSync(src) ? src : await placeholder(1024, 1024, [225, 225, 225])
  for (const s of [480, 960]) {
    const webp = join(out, `${g}-${s}.webp`)
    await sharp(input).resize(s, s, { fit: 'cover' }).webp({ quality: 80 }).toFile(webp)
    report.push(`${g}-${s}: webp ${kb(webp)}${existsSync(src) ? '' : ' (placeholder)'}`)
  }
}

writeFileSync(join(out, 'SIZES.txt'), report.join('\n') + '\n')
console.log(report.join('\n'))
