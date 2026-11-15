// Compositor de mockups, puro (sin DOM): trabaja sobre arreglos de píxeles para poder probarlo
// con Vitest y moverlo a un Worker si hace falta. Receta (validada en pb/tools/garments.mjs):
//   prenda = tinte × sombreado (+ realce de luces en tintes oscuros: multiplicar solo aplana)
//   diseño = muestreado por homografía dentro del área, × sombreado (conserva pliegues)
//   alfa   = máscara de la prenda
import { aplicar, homografiaDesdeUnitario, invertir, type Cuad } from './homografia'

export interface Colocacion {
  /** centro del diseño dentro del área, normalizado (0–1) */
  x: number
  y: number
  /** 1 = el diseño cabe completo en el área (contain) */
  scale: number
  /** grados */
  rotation: number
}

export const COLOCACION_INICIAL: Colocacion = { x: 0.5, y: 0.42, scale: 0.9, rotation: 0 }

export interface Arte {
  rgba: Uint8ClampedArray
  w: number
  h: number
}

export interface Entrada {
  /** lado de la salida en px (cuadrada) */
  size: number
  /** sombreado: un canal por píxel (0–255, 255 = blanco de la tela) */
  sombreado: Uint8ClampedArray
  /** máscara: un canal por píxel (0–255) */
  mascara: Uint8ClampedArray
  /** tinte de la prenda, 0–255 */
  tinte: [number, number, number]
  /** área de impresión, normalizada a la imagen */
  area: Cuad
  arte?: Arte
  colocacion?: Colocacion
}

const oscuro = (t: [number, number, number]) => (t[0] + t[1] + t[2]) / 3 < 90

/** Proporción ancho/alto real del área (promedio de lados opuestos). */
export function proporcionArea(q: Cuad): number {
  const d = (a: number[], b: number[]) => Math.hypot(a[0] - b[0], a[1] - b[1])
  return (d(q[0], q[1]) + d(q[3], q[2])) / (d(q[0], q[3]) + d(q[1], q[2]))
}

export function componer({ size, sombreado, mascara, tinte, area, arte, colocacion = COLOCACION_INICIAL }: Entrada): Uint8ClampedArray<ArrayBuffer> {
  const out = new Uint8ClampedArray(size * size * 4)
  const lift = oscuro(tinte)
  const tr = tinte[0] / 255
  const tg = tinte[1] / 255
  const tb = tinte[2] / 255

  // área en píxeles de salida y su homografía inversa (salida → u, v)
  const q = area.map(([x, y]) => [x * size, y * size]) as Cuad
  const inv = invertir(homografiaDesdeUnitario(q))
  let x0 = size, y0 = size, x1 = 0, y1 = 0
  for (const [x, y] of q) {
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y)
  }
  // espacio del área: AW × AH "px de área"; el diseño cabe (contain) × scale
  const AH = 1000
  const AW = AH * proporcionArea(area)
  const fit = arte ? Math.min(AW / arte.w, AH / arte.h) * colocacion.scale : 1
  const rad = (-colocacion.rotation * Math.PI) / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  const cx = colocacion.x * AW
  const cy = colocacion.y * AH

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x
      const a = mascara[i]
      if (a === 0) continue
      const s = sombreado[i] / 255
      const up = lift ? Math.max(0, s - 0.92) * 1.6 : 0
      let r = tr * s + up
      let g = tg * s + up
      let b = tb * s + up

      if (arte && x >= x0 && x <= x1 && y >= y0 && y <= y1) {
        const [u, v] = aplicar(inv, x + 0.5, y + 0.5)
        if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
          // punto del área → coordenadas del diseño (deshacer centro, rotación y escala)
          const px = u * AW - cx
          const py = v * AH - cy
          const dx = (px * cos - py * sin) / fit + arte.w / 2
          const dy = (px * sin + py * cos) / fit + arte.h / 2
          if (dx >= 0 && dy >= 0 && dx < arte.w - 1 && dy < arte.h - 1) {
            const [ar, ag, ab, aa] = bilineal(arte, dx, dy)
            if (aa > 0) {
              const k = aa / 255
              r = r * (1 - k) + (ar / 255) * s * k
              g = g * (1 - k) + (ag / 255) * s * k
              b = b * (1 - k) + (ab / 255) * s * k
            }
          }
        }
      }
      const o = i * 4
      out[o] = r * 255
      out[o + 1] = g * 255
      out[o + 2] = b * 255
      out[o + 3] = a
    }
  }
  return out
}

function bilineal({ rgba, w }: Arte, x: number, y: number): [number, number, number, number] {
  const x0 = x | 0
  const y0 = y | 0
  const fx = x - x0
  const fy = y - y0
  const i00 = (y0 * w + x0) * 4
  const i10 = i00 + 4
  const i01 = i00 + w * 4
  const i11 = i01 + 4
  const res: [number, number, number, number] = [0, 0, 0, 0]
  for (let c = 0; c < 4; c++) {
    const top = rgba[i00 + c] * (1 - fx) + rgba[i10 + c] * fx
    const bot = rgba[i01 + c] * (1 - fx) + rgba[i11 + c] * fx
    res[c] = top * (1 - fy) + bot * fy
  }
  return res
}
