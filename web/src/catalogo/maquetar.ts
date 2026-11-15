// Maquetación automática del catálogo (hilo «Editor de catálogo»), pura y probada.
// La comparten la vista previa del admin y el visor público.
//
//   portada → por categoría (separador + páginas de productos de N en N) → contraportada
//   + páginas especiales (promoción, imagen completa) insertadas por posición
//   + en pliego doble, si las interiores son impares, una página de relleno antes de la
//     contraportada (sólo en pliego).
//
// `position` de una especial = índice de la página automática ANTES de la cual va
// (1 = justo después de la portada; nunca antes de la portada ni después de la contraportada).

export interface CategoriaM {
  id: string
  name: string
  sort: number
}
export interface ProductoM {
  id: string
  category: string
  sort: number
}
export interface EspecialM {
  id: string
  position: number
  created: string
}

export interface Seccion {
  id: string // '' = «Otros» (sin categoría)
  nombre: string
}

export type Pagina<P extends ProductoM = ProductoM, E extends EspecialM = EspecialM> =
  | { clave: string; tipo: 'portada' }
  | { clave: string; tipo: 'separador'; seccion: Seccion }
  | { clave: string; tipo: 'productos'; seccion: Seccion; productos: P[] }
  | { clave: string; tipo: 'especial'; especial: E }
  | { clave: string; tipo: 'relleno' }
  | { clave: string; tipo: 'contraportada' }

export type Modo = 'movil' | 'pliego'

export interface Entrada<P extends ProductoM, E extends EspecialM> {
  categorias: CategoriaM[]
  productos: P[]
  /** catalogs.category_order */
  orden?: string[] | null
  porPagina: number
  especiales?: E[]
  modo: Modo
}

/** Secciones en orden: las de `orden`, luego las demás categorías con productos (por sort y
 *  nombre) y al final «Otros» para los productos sin categoría válida. Sólo las que tienen productos. */
export function secciones<P extends ProductoM>(categorias: CategoriaM[], productos: P[], orden?: string[] | null): { seccion: Seccion; productos: P[] }[] {
  const porCat = new Map<string, P[]>()
  const validas = new Set(categorias.map((c) => c.id))
  for (const p of [...productos].sort((a, b) => a.sort - b.sort)) {
    const k = validas.has(p.category) ? p.category : ''
    porCat.set(k, [...(porCat.get(k) ?? []), p])
  }
  const resto = [...categorias].sort((a, b) => a.sort - b.sort || a.name.localeCompare(b.name, 'es'))
  const ordenadas = [
    ...(orden ?? []).map((id) => categorias.find((c) => c.id === id)).filter((c): c is CategoriaM => !!c),
    ...resto.filter((c) => !(orden ?? []).includes(c.id)),
  ]
  const out = ordenadas.filter((c) => porCat.has(c.id)).map((c) => ({ seccion: { id: c.id, nombre: c.name }, productos: porCat.get(c.id)! }))
  if (porCat.has('')) out.push({ seccion: { id: '', nombre: 'Otros' }, productos: porCat.get('')! })
  return out
}

/** Páginas automáticas (sin especiales ni relleno). */
export function automaticas<P extends ProductoM>(e: Pick<Entrada<P, EspecialM>, 'categorias' | 'productos' | 'orden' | 'porPagina'>): Pagina<P>[] {
  const n = Math.max(1, e.porPagina)
  const out: Pagina<P>[] = [{ clave: 'portada', tipo: 'portada' }]
  for (const { seccion, productos } of secciones(e.categorias, e.productos, e.orden)) {
    out.push({ clave: `sep:${seccion.id}`, tipo: 'separador', seccion })
    for (let i = 0; i < productos.length; i += n) out.push({ clave: `prod:${seccion.id}:${i / n}`, tipo: 'productos', seccion, productos: productos.slice(i, i + n) })
  }
  out.push({ clave: 'contraportada', tipo: 'contraportada' })
  return out
}

export function maquetar<P extends ProductoM, E extends EspecialM>(e: Entrada<P, E>): Pagina<P, E>[] {
  const auto = automaticas(e) as Pagina<P, E>[]
  const max = auto.length - 1
  const pos = (es: E) => Math.min(max, Math.max(1, es.position))
  // orden por posición YA acotada; a igual posición, la creada primero
  const especiales = [...(e.especiales ?? [])].sort((a, b) => pos(a) - pos(b) || a.created.localeCompare(b.created))
  const out: Pagina<P, E>[] = []
  auto.forEach((pag, i) => {
    if (i > 0) for (const es of especiales) if (pos(es) === i) out.push({ clave: `esp:${es.id}`, tipo: 'especial', especial: es })
    out.push(pag)
  })
  if (e.modo === 'pliego' && (out.length - 2) % 2 === 1) out.splice(out.length - 1, 0, { clave: 'relleno', tipo: 'relleno' })
  return out
}

/** Tras reordenar en la vista previa (lista de claves en su nuevo orden), la `position` de cada
 *  especial = cuántas páginas automáticas quedaron antes de ella (acotada a [1, autos − 1]). */
export function posicionesDesdeOrden(claves: string[]): Map<string, number> {
  const autos = claves.filter((k) => !k.startsWith('esp:') && k !== 'relleno').length
  const out = new Map<string, number>()
  let vistas = 0
  for (const k of claves) {
    if (k === 'relleno') continue
    if (k.startsWith('esp:')) out.set(k.slice(4), Math.min(autos - 1, Math.max(1, vistas)))
    else vistas++
  }
  return out
}
