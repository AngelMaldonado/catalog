import { describe, expect, it } from 'vitest'
import { maquetar, posicionesDesdeOrden, secciones } from './maquetar'

const cats = [
  { id: 'pla', name: 'Playeras', sort: 1 },
  { id: 'sud', name: 'Sudaderas', sort: 2 },
  { id: 'gor', name: 'Gorras', sort: 3 },
]
const prod = (id: string, category: string, sort: number) => ({ id, category, sort })
const productos = [prod('p1', 'pla', 1), prod('p2', 'pla', 2), prod('p3', 'pla', 3), prod('s1', 'sud', 4), prod('x1', 'borrada', 5)]
const tipos = (ps: { tipo: string }[]) => ps.map((p) => p.tipo)

describe('secciones', () => {
  it('respeta category_order, luego las demás por sort, y «Otros» al final; omite vacías', () => {
    const s = secciones(cats, productos, ['sud'])
    expect(s.map((x) => x.seccion.nombre)).toEqual(['Sudaderas', 'Playeras', 'Otros'])
  })
})

describe('maquetar', () => {
  it('portada → separador + productos de N en N → contraportada', () => {
    const ps = maquetar({ categorias: cats, productos, porPagina: 2, modo: 'movil' })
    expect(tipos(ps)).toEqual(['portada', 'separador', 'productos', 'productos', 'separador', 'productos', 'separador', 'productos', 'contraportada'])
    const primera = ps[2]
    expect(primera.tipo === 'productos' && primera.productos.map((p) => p.id)).toEqual(['p1', 'p2'])
  })
  it('inserta especiales antes de la página automática de su posición, acotadas', () => {
    const esp = [
      { id: 'a', position: 1, created: '1' },
      { id: 'b', position: 0, created: '2' }, // acotada a 1
      { id: 'c', position: 99, created: '3' }, // acotada a antes de la contraportada
    ]
    const ps = maquetar({ categorias: cats, productos: [prod('p1', 'pla', 1)], porPagina: 4, especiales: esp, modo: 'movil' })
    expect(ps.map((p) => p.clave)).toEqual(['portada', 'esp:a', 'esp:b', 'sep:pla', 'prod:pla:0', 'esp:c', 'contraportada'])
  })
  it('en pliego agrega relleno antes de la contraportada si las interiores son impares', () => {
    const movil = maquetar({ categorias: cats, productos: [prod('p1', 'pla', 1), prod('p2', 'pla', 2)], porPagina: 1, modo: 'movil' })
    expect(movil.length - 2).toBe(3)
    const pliego = maquetar({ categorias: cats, productos: [prod('p1', 'pla', 1), prod('p2', 'pla', 2)], porPagina: 1, modo: 'pliego' })
    expect(tipos(pliego).slice(-2)).toEqual(['relleno', 'contraportada'])
    expect((pliego.length - 2) % 2).toBe(0)
  })
  it('catálogo vacío: portada y contraportada', () => {
    expect(tipos(maquetar({ categorias: cats, productos: [], porPagina: 4, modo: 'pliego' }))).toEqual(['portada', 'contraportada'])
  })
})

describe('posicionesDesdeOrden', () => {
  it('la posición es cuántas automáticas quedaron antes, acotada', () => {
    const p = posicionesDesdeOrden(['esp:z', 'portada', 'sep:pla', 'esp:a', 'prod:pla:0', 'relleno', 'contraportada', 'esp:y'])
    expect(p.get('a')).toBe(2)
    expect(p.get('z')).toBe(1) // no puede ir antes de la portada
    expect(p.get('y')).toBe(3) // ni después de la contraportada
  })
})
