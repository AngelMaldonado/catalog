// Garment templates: mask + shading map from the white base photos (pb/seed/garments/*-front-white.png).
//
//   mask     alpha of the garment (white = garment), feathered 1 px. The background of the
//            photos is a flat grey (±1 level) while the white fabric goes 200–255, so plain
//            thresholds fail (folds are as grey as the background), and so does growing through
//            small steps (fabric gradients are as smooth as the backdrop). What separates them is
//            TEXTURE: the backdrop's local σ (7×7) is ~0.5, fabric ≥ 1.1 even where it is smooth.
//            The background is region-grown from the border through flat pixels (σ < FLAT) whose
//            mean is near the backdrop grey (or darker: the contact shadow is flat too).
//   shading  luminance of the garment normalised to its own brightest fabric (p98 → 255):
//            multiply it over a tint or a design to keep folds and texture.
//
// Usage: node garments.mjs [--only kind[,kind]] [--debug] [--preview]   (writes next to the
// photos; --debug also writes cutouts to /tmp/catalog-garments for visual checks)
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

const DIR = new URL('../seed/garments/', import.meta.url).pathname
const DEBUG = process.argv.includes('--debug')
const FLAT = 0.85 // local σ below this is backdrop
const R = 3 // local window radius (7×7)
const ALL_KINDS = ['tshirt', 'hoodie', 'crewneck', 'cap']
const only = process.argv.indexOf('--only')
const KINDS = only > 0 ? process.argv[only + 1].split(',') : ALL_KINDS

function boxBlur(src, W, H, r) {
  const tmp = new Float32Array(W * H)
  const out = new Float32Array(W * H)
  for (let y = 0; y < H; y++) {
    let acc = 0
    for (let x = -r; x <= r; x++) acc += src[y * W + Math.min(W - 1, Math.max(0, x))]
    for (let x = 0; x < W; x++) {
      tmp[y * W + x] = acc / (2 * r + 1)
      acc += src[y * W + Math.min(W - 1, x + r + 1)] - src[y * W + Math.max(0, x - r)]
    }
  }
  for (let x = 0; x < W; x++) {
    let acc = 0
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(H - 1, Math.max(0, y)) * W + x]
    for (let y = 0; y < H; y++) {
      out[y * W + x] = acc / (2 * r + 1)
      acc += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x]
    }
  }
  return out
}

/** Background region grown from the border; returns Uint8Array (1 = background). */
function growBackground(lum, W, H) {
  // texture = luminance minus its smooth trend, so the backdrop's vignette and the contact
  // shadow (smooth gradients) do not count as texture; σ is measured on that high-pass signal
  const mean = boxBlur(lum, W, H, R)
  const trend = boxBlur(lum, W, H, 8)
  const hp2 = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) hp2[i] = (lum[i] - trend[i]) ** 2
  const varHp = boxBlur(hp2, W, H, R)
  const flat = new Uint8Array(W * H)
  const corner = (mean[W * 2 + 2] + mean[W * 3 - 3] + mean[W * (H - 2) + 2] + mean[W * (H - 1) - 3]) / 4
  for (let i = 0; i < W * H; i++) {
    flat[i] = Math.sqrt(varHp[i]) < FLAT && mean[i] < corner + 14 && mean[i] > corner - 40 ? 1 : 0
  }
  const bg = new Uint8Array(W * H)
  const queue = new Int32Array(W * H)
  let head = 0
  let tail = 0
  const push = (i) => {
    bg[i] = 1
    queue[tail++] = i
  }
  for (let x = 0; x < W; x++) {
    push(x)
    push((H - 1) * W + x)
  }
  for (let y = 1; y < H - 1; y++) {
    push(y * W)
    push(y * W + W - 1)
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % W
    const y = (i - x) / W
    const n = [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, y > 0 ? i - W : -1, y < H - 1 ? i + W : -1]
    for (const j of n) if (j >= 0 && !bg[j] && flat[j]) push(j)
  }
  return bg
}

/** Keep the largest garment component and fill its holes. */
function cleanMask(bg, W, H) {
  const label = new Int32Array(W * H).fill(-1)
  const queue = new Int32Array(W * H)
  let best = -1
  let bestSize = 0
  let next = 0
  for (let s = 0; s < W * H; s++) {
    if (bg[s] || label[s] >= 0) continue
    let head = 0
    let tail = 0
    queue[tail++] = s
    label[s] = next
    while (head < tail) {
      const i = queue[head++]
      const x = i % W
      for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) {
        if (j >= 0 && j < W * H && !bg[j] && label[j] < 0) {
          label[j] = next
          queue[tail++] = j
        }
      }
    }
    if (tail > bestSize) {
      bestSize = tail
      best = next
    }
    next++
  }
  const mask = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) mask[i] = label[i] === best ? 1 : 0
  // holes: non-garment pixels not connected to the border become garment
  const outside = new Uint8Array(W * H)
  let head = 0
  let tail = 0
  const seed = (i) => {
    if (!mask[i] && !outside[i]) {
      outside[i] = 1
      queue[tail++] = i
    }
  }
  for (let x = 0; x < W; x++) {
    seed(x)
    seed((H - 1) * W + x)
  }
  for (let y = 0; y < H; y++) {
    seed(y * W)
    seed(y * W + W - 1)
  }
  while (head < tail) {
    const i = queue[head++]
    const x = i % W
    for (const j of [x > 0 ? i - 1 : -1, x < W - 1 ? i + 1 : -1, i - W, i + W]) if (j >= 0 && j < W * H) seed(j)
  }
  for (let i = 0; i < W * H; i++) if (!outside[i]) mask[i] = 1
  return mask
}

function bbox(mask, W, H) {
  let x0 = W, y0 = H, x1 = 0, y1 = 0
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++)
      if (mask[y * W + x]) {
        if (x < x0) x0 = x
        if (x > x1) x1 = x
        if (y < y0) y0 = y
        if (y > y1) y1 = y
      }
  return { x0, y0, x1, y1 }
}

const results = {}
for (const kind of KINDS) {
  const src = join(DIR, `${kind}-front-white.png`)
  const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true })
  const W = info.width
  const H = info.height
  const lum = new Float32Array(W * H)
  for (let i = 0; i < W * H; i++) lum[i] = 0.2126 * data[i * 3] + 0.7152 * data[i * 3 + 1] + 0.0722 * data[i * 3 + 2]
  // the 7×7 texture window marks ~R px of backdrop around the outline as texture: erode R px
  const raw = cleanMask(growBackground(lum, W, H), W, H)
  const eroded = boxBlur(Float32Array.from(raw), W, H, R)
  const mask = new Uint8Array(W * H)
  for (let i = 0; i < W * H; i++) mask[i] = eroded[i] > 0.999 ? 1 : 0

  // shading: garment luminance / p98 of the garment
  const vals = []
  for (let i = 0; i < W * H; i += 7) if (mask[i]) vals.push(lum[i])
  vals.sort((a, b) => a - b)
  const p98 = vals[Math.floor(vals.length * 0.98)]
  const shade = Buffer.alloc(W * H)
  const alpha = Buffer.alloc(W * H)
  for (let i = 0; i < W * H; i++) {
    shade[i] = mask[i] ? Math.min(255, Math.round((lum[i] / p98) * 255)) : 255
    alpha[i] = mask[i] ? 255 : 0
  }
  const feathered = await sharp(alpha, { raw: { width: W, height: H, channels: 1 } }).blur(0.8).extractChannel(0).raw().toBuffer()
  await sharp(feathered, { raw: { width: W, height: H, channels: 1 } }).toColourspace('b-w').png().toFile(join(DIR, `${kind}-mask.png`))
  await sharp(shade, { raw: { width: W, height: H, channels: 1 } }).toColourspace('b-w').png().toFile(join(DIR, `${kind}-shading.png`))

  const b = bbox(mask, W, H)
  let area = 0
  for (let i = 0; i < W * H; i++) area += mask[i]
  results[kind] = { W, H, bbox: b, coverage: +(area / (W * H)).toFixed(3), p98: +p98.toFixed(1) }
  console.log(kind, JSON.stringify(results[kind]))

  if (DEBUG) {
    mkdirSync('/tmp/catalog-garments', { recursive: true })
    // cutout on magenta to judge the mask edges
    const rgba = Buffer.alloc(W * H * 4)
    for (let i = 0; i < W * H; i++) {
      const a = feathered[i] / 255
      rgba[i * 4] = Math.round(data[i * 3] * a + 255 * (1 - a))
      rgba[i * 4 + 1] = Math.round(data[i * 3 + 1] * a)
      rgba[i * 4 + 2] = Math.round(data[i * 3 + 2] * a + 255 * (1 - a))
      rgba[i * 4 + 3] = 255
    }
    await sharp(rgba, { raw: { width: W, height: H, channels: 4 } }).resize(600).png().toFile(`/tmp/catalog-garments/${kind}-cutout.png`)
  }
}

// ---- print areas (normalised quads: top-left, top-right, bottom-right, bottom-left) ----------
// Derived from the masks: t-shirt torso = 0.42 of the width (~20 in) → a standard 12×16 in print
// is 0.25 × 0.34, starting ~2.5 in below the collar; hoodie: chest square between drawstrings and
// pocket; cap: front panels, a bit wider at the bottom to follow the crown. Copied into the
// migration that loads these assets (pb/pb_migrations/1794768200_garment_assets.js).
export const PRINT_AREAS = {
  tshirt: [[0.374, 0.21], [0.626, 0.21], [0.626, 0.546], [0.374, 0.546]],
  hoodie: [[0.385, 0.35], [0.615, 0.35], [0.615, 0.58], [0.385, 0.58]],
  crewneck: [[0.34, 0.22], [0.66, 0.22], [0.66, 0.62], [0.34, 0.62]],
  cap: [[0.36, 0.27], [0.64, 0.27], [0.665, 0.52], [0.335, 0.52]],
}
console.log('PRINT_AREAS', JSON.stringify(PRINT_AREAS))

// ---- --preview: tinted garments with a test design, to judge masks and shading ---------------
if (process.argv.includes('--preview')) {
  const S = 600
  const design = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600">
    <circle cx="300" cy="300" r="270" fill="none" stroke="#c0392b" stroke-width="36"/>
    <text x="300" y="285" font-family="Georgia" font-size="120" font-weight="700" text-anchor="middle" fill="#1e8449">FELIZ</text>
    <text x="300" y="400" font-family="Georgia" font-size="96" font-weight="700" text-anchor="middle" fill="#c0392b">NAVIDAD</text></svg>`)
  const tints = { Blanco: [255, 255, 255], Negro: [29, 29, 31], Rojo: [179, 33, 45], Arena: [216, 199, 168] }
  const tiles = []
  for (const kind of KINDS) {
    const shade = await sharp(join(DIR, `${kind}-shading.png`)).resize(S).extractChannel(0).raw().toBuffer()
    const alpha = await sharp(join(DIR, `${kind}-mask.png`)).resize(S).extractChannel(0).raw().toBuffer()
    const q = PRINT_AREAS[kind]
    const x0 = Math.round(Math.min(q[0][0], q[3][0]) * S), x1 = Math.round(Math.max(q[1][0], q[2][0]) * S)
    const y0 = Math.round(q[0][1] * S), y1 = Math.round(q[3][1] * S)
    const side = Math.min(x1 - x0, y1 - y0)
    const art = await sharp(design).resize(side, side).ensureAlpha().raw().toBuffer()
    const ax = x0 + Math.round((x1 - x0 - side) / 2), ay = y0 + Math.round((y1 - y0 - side) / 2)
    for (const [name, t] of Object.entries(tints)) {
      const out = Buffer.alloc(S * S * 3)
      const dark = (t[0] + t[1] + t[2]) / 3 < 90
      for (let i = 0; i < S * S; i++) {
        const s = shade[i] / 255
        const a = alpha[i] / 255
        // dark fabrics: multiply alone flattens folds; lift highlights a little
        const lift = dark ? Math.max(0, s - 0.92) * 1.6 : 0
        let c = t.map((v) => (v / 255) * s + lift)
        const x = i % S, y = (i - x) / S
        if (x >= ax && x < ax + side && y >= ay && y < ay + side) {
          const j = ((y - ay) * side + (x - ax)) * 4
          const da = art[j + 3] / 255
          if (da > 0) c = c.map((v, k) => v * (1 - da) + (art[j + k] / 255) * s * da)
        }
        for (let k = 0; k < 3; k++) out[i * 3 + k] = Math.round(Math.min(1, c[k]) * 255 * a + 236 * (1 - a))
      }
      tiles.push(await sharp(out, { raw: { width: S, height: S, channels: 3 } }).resize(300).png().toBuffer())
    }
  }
  const cols = Object.keys(tints).length
  await sharp({ create: { width: 300 * cols, height: 300 * KINDS.length, channels: 3, background: '#ececec' } })
    .composite(tiles.map((input, k) => ({ input, left: (k % cols) * 300, top: Math.floor(k / cols) * 300 })))
    .png()
    .toFile('/tmp/catalog-garments/preview.png')
  console.log('preview → /tmp/catalog-garments/preview.png')
}
