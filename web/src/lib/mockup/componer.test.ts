import { describe, expect, it } from 'vitest'
import { aplicar, homografiaDesdeUnitario, invertir, type Cuad } from './homografia'
import { componer, proporcionArea } from './componer'

const rect: Cuad = [[0.25, 0.25], [0.75, 0.25], [0.75, 0.75], [0.25, 0.75]]
const trapecio: Cuad = [[0.36, 0.27], [0.64, 0.27], [0.665, 0.52], [0.335, 0.52]]
const cerca = (a: number, b: number) => expect(Math.abs(a - b)).toBeLessThan(1e-9)

describe('homografía', () => {
  it('lleva las esquinas del cuadrado unitario a las del cuadrilátero', () => {
    const m = homografiaDesdeUnitario(trapecio)
    const unit: [number, number][] = [[0, 0], [1, 0], [1, 1], [0, 1]]
    unit.forEach(([u, v], k) => {
      const [x, y] = aplicar(m, u, v)
      cerca(x, trapecio[k][0])
      cerca(y, trapecio[k][1])
    })
  })
  it('la inversa deshace la transformación', () => {
    const m = homografiaDesdeUnitario(trapecio)
    const [x, y] = aplicar(m, 0.3, 0.7)
    const [u, v] = aplicar(invertir(m), x, y)
    cerca(u, 0.3)
    cerca(v, 0.7)
  })
})

const lisa = (size: number, valor: number) => new Uint8ClampedArray(size * size).fill(valor)

describe('componer', () => {
  it('fuera de la máscara deja transparente; dentro, tinte × sombreado', () => {
    const size = 8
    const mascara = lisa(size, 255)
    mascara[0] = 0
    const out = componer({ size, sombreado: lisa(size, 128), mascara, tinte: [200, 100, 50], area: rect })
    expect(out[3]).toBe(0)
    const i = 9 * 4
    expect(out[i + 3]).toBe(255)
    expect(out[i]).toBe(Math.round(200 * (128 / 255)))
    expect(out[i + 1]).toBe(Math.round(100 * (128 / 255)))
  })
  it('en tintes oscuros realza las luces altas para no aplanar la tela', () => {
    const size = 4
    const plano = componer({ size, sombreado: lisa(size, 255), mascara: lisa(size, 255), tinte: [29, 29, 31], area: rect })
    expect(plano[0]).toBeGreaterThan(29) // 29 + (1 − 0.92) × 1.6 × 255 ≈ 61
  })
  it('estampa el diseño dentro del área y nada fuera de ella', () => {
    const size = 40
    const rojo = new Uint8ClampedArray(10 * 10 * 4)
    for (let i = 0; i < 100; i++) rojo.set([255, 0, 0, 255], i * 4)
    const out = componer({
      size, sombreado: lisa(size, 255), mascara: lisa(size, 255), tinte: [255, 255, 255], area: rect,
      arte: { rgba: rojo, w: 10, h: 10 }, colocacion: { x: 0.5, y: 0.5, scale: 1, rotation: 0 },
    })
    const px = (x: number, y: number) => Array.from(out.slice((y * size + x) * 4, (y * size + x) * 4 + 3))
    expect(px(20, 20)).toEqual([255, 0, 0]) // centro del área
    expect(px(2, 2)).toEqual([255, 255, 255]) // fuera del área: sólo la prenda
  })
  it('la proporción del área es ancho/alto', () => {
    expect(proporcionArea([[0, 0], [3, 0], [3, 4], [0, 4]])).toBeCloseTo(0.75)
  })
})

describe('recorte', () => {
  // diseño sólido rojo, 10×10, escalado 2×: se sale del área (la mitad central de la imagen)
  const size = 40
  const arte = { rgba: new Uint8ClampedArray(10 * 10 * 4).map((_, i) => (i % 4 === 0 || i % 4 === 3 ? 255 : 0)), w: 10, h: 10 }
  const base = { size, sombreado: lisa(size, 255), mascara: lisa(size, 255), tinte: [255, 255, 255] as [number, number, number], area: rect, arte, colocacion: { x: 0.5, y: 0.5, scale: 2, rotation: 0 } }
  const rojo = (px: Uint8ClampedArray, x: number, y: number) => px[(y * size + x) * 4 + 1] < 50
  it("'area' corta el diseño en el borde del área", () => {
    const px = componer({ ...base, recorte: 'area' })
    expect(rojo(px, 20, 20)).toBe(true)
    expect(rojo(px, 5, 20)).toBe(false) // fuera del área (x < 10)
  })
  it("'prenda' deja que el diseño se salga del área, hasta la silueta", () => {
    const px = componer({ ...base, recorte: 'prenda' })
    expect(rojo(px, 20, 20)).toBe(true)
    expect(rojo(px, 5, 20)).toBe(true)
    const sinPrenda = componer({ ...base, recorte: 'prenda', mascara: lisa(size, 0) })
    expect(sinPrenda[(20 * size + 5) * 4 + 3]).toBe(0)
  })
})

describe('perspectiva fuera del área', () => {
  it('un área trapecio no pinta el diseño reflejado más allá del horizonte', () => {
    // lados que se juntan hacia arriba: el horizonte queda en y ≈ 0.44 de la imagen
    const embudo: Cuad = [[0.45, 0.5], [0.55, 0.5], [0.9, 0.9], [0.1, 0.9]]
    const size = 50
    const arte = { rgba: new Uint8ClampedArray(10 * 10 * 4).map((_, i) => (i % 4 === 0 || i % 4 === 3 ? 255 : 0)), w: 10, h: 10 }
    const px = componer({ size, sombreado: lisa(size, 255), mascara: lisa(size, 255), tinte: [255, 255, 255], area: embudo, arte, colocacion: { x: 0.5, y: 0.5, scale: 3, rotation: 0 }, recorte: 'prenda' })
    const rojo = (x: number, y: number) => px[(y * size + x) * 4 + 1] < 50
    expect(rojo(25, 35)).toBe(true) // dentro del área
    expect(rojo(25, 5)).toBe(false) // arriba del horizonte: antes salía reflejado
  })
})
