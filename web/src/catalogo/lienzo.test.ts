import { describe, expect, it } from 'vitest'
import { PLANTILLAS_OG, PRODUCTOS, cantidadOg, elementosDe, elementosOg, ogInicial, portadaInicial, type EsquinaLogo } from './lienzo'

describe('plantillas de la imagen para redes', () => {
  for (const p of PLANTILLAS_OG)
    for (const posTitulo of p.posiciones)
      for (let cantidad = p.min; cantidad <= p.max; cantidad++)
        it(`${p.id} (${posTitulo}, ${cantidad}): elementos dentro del lienzo y ${cantidad} productos`, () => {
          const els = elementosOg({ ...ogInicial(), plantilla: p.id, posTitulo, cantidad })
          for (const e of els) {
            expect(e.x).toBeGreaterThan(0)
            expect(e.x).toBeLessThan(1)
            expect(e.y).toBeGreaterThan(0)
            expect(e.y).toBeLessThan(1)
            // un producto no se sale del lienzo por los lados
            if (PRODUCTOS.includes(e.id)) {
              expect(e.x - e.s / 2).toBeGreaterThanOrEqual(0)
              expect(e.x + e.s / 2).toBeLessThanOrEqual(1)
            }
          }
          expect(els.filter((e) => PRODUCTOS.includes(e.id))).toHaveLength(cantidad)
        })

  it('sin cantidad elegida, la de la plantilla; fuera de rango, se ajusta', () => {
    expect(cantidadOg({ plantilla: 'fila', cantidad: null })).toBe(3)
    expect(cantidadOg({ plantilla: 'fila', cantidad: 9 })).toBe(5)
    expect(cantidadOg({ plantilla: 'cuadricula', cantidad: 1 })).toBe(2)
  })

  it('el logo va en la esquina elegida, o no va', () => {
    const logo = (esquinaLogo: EsquinaLogo) => elementosOg({ ...ogInicial(), esquinaLogo }).find((e) => e.id === 'logo')
    expect(logo('sup-izq')!.x).toBeLessThan(0.5)
    expect(logo('sup-izq')!.y).toBeLessThan(0.5)
    expect(logo('inf-der')!.x).toBeGreaterThan(0.5)
    expect(logo('inf-der')!.y).toBeGreaterThan(0.5)
    expect(logo('ninguna')).toBeUndefined()
  })

  it('el precio «desde» es opcional', () => {
    expect(elementosOg({ ...ogInicial(), precio: true }).some((e) => e.id === 'precio')).toBe(true)
    expect(elementosOg({ ...ogInicial(), precio: false }).some((e) => e.id === 'precio')).toBe(false)
  })

  it('lo movido a mano gana sobre la plantilla', () => {
    const mano = [{ id: 'titulo' as const, visible: true, x: 0.1, y: 0.1, s: 0.05 }]
    expect(elementosDe({ ...ogInicial(), elementos: mano })).toBe(mano)
    expect(elementosDe(ogInicial())).toEqual(elementosOg(ogInicial()))
  })
})

describe('portada inicial', () => {
  it('muestra logo, nombre y título, y oculta subtítulo y productos', () => {
    const vis = Object.fromEntries(portadaInicial().elementos.map((e) => [e.id, e.visible]))
    expect(vis).toMatchObject({ logo: true, negocio: true, titulo: true, subtitulo: false, producto1: false })
  })
})
