// Datos del visor público: /api/visor[/slug] (hook de PocketBase) con URLs firmadas de los
// renders. Arma las páginas con maquetar() y pinta cada página bajo demanda, cargando sólo las
// imágenes que esa página necesita (precarga en ventana, decidido en el spike).
import type { FondoPagina } from '../lib/types'
import { maquetar, type Modo } from '../catalogo/maquetar'
import { pintarPagina, type ContextoPintado, type EspecialPintable, type PaginaPintable, type ProductoPintable } from '../catalogo/pintar'

export interface ColorVisor {
  name: string
  hex: string
  r480: string
  r960: string
}
export interface ProductoVisor {
  id: string
  category: string
  sort: number
  name: string
  price: number
  sizes: string[]
  colores: ColorVisor[]
}
export interface RespuestaVisor {
  catalogo: { id: string; name: string; slug: string; page_turn: 'rigid' | 'realistic'; layout: '1' | '2' | '4'; category_order: string[] }
  tema: { palette: ContextoPintado['paleta']; fonts: { title: string; body: string }; fondos: Record<FondoPagina, string> }
  negocio: { nombre: string; logo: string; whatsapp: string; instagram: string; facebook: string; tiktok: string; direccion: string; moneda: string }
  categorias: { id: string; name: string; sort: number }[]
  productos: ProductoVisor[]
  especiales: { id: string; kind: 'promo' | 'image'; title: string; body: string; image: string; position: number; created: string }[]
  caduca: number
}

export async function pedirVisor(slug?: string): Promise<RespuestaVisor> {
  const r = await fetch(slug ? `/api/visor/${encodeURIComponent(slug)}` : '/api/visor')
  if (!r.ok) throw Object.assign(new Error('visor'), { status: r.status })
  return r.json()
}

const decodificar = (url: string) =>
  fetch(url)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
    .then((b) => createImageBitmap(b))

/** Fuente de páginas para los motores (rígido, realista, deslizar). */
export class FuentePaginas {
  paginas: PaginaPintable[]
  private datos: RespuestaVisor
  private slug?: string
  private bitmaps = new Map<string, Promise<ImageBitmap | undefined>>()
  private lienzos = new Map<string, Promise<HTMLCanvasElement>>()
  private orden: string[] = []
  private contexto: ContextoPintado
  private renovando: Promise<void> | null = null
  private productos = new Map<string, ProductoVisor>()

  constructor(datos: RespuestaVisor, modo: Modo, slug?: string) {
    this.datos = datos
    this.slug = slug
    datos.productos.forEach((p) => this.productos.set(p.id, p))
    const productos: ProductoPintable[] = datos.productos.map((p) => ({ id: p.id, category: p.category, sort: p.sort, name: p.name, price: p.price, colores: p.colores.map(({ name, hex }) => ({ name, hex })) }))
    const especiales: EspecialPintable[] = datos.especiales.map((e) => ({ id: e.id, position: e.position, created: e.created, kind: e.kind, title: e.title, body: e.body }))
    this.paginas = maquetar({ categorias: datos.categorias, productos, orden: datos.catalogo.category_order, porPagina: Number(datos.catalogo.layout), especiales, modo })
    this.contexto = {
      catalogo: datos.catalogo.name,
      negocio: { nombre: datos.negocio.nombre, whatsapp: datos.negocio.whatsapp, instagram: datos.negocio.instagram, facebook: datos.negocio.facebook, tiktok: datos.negocio.tiktok, direccion: datos.negocio.direccion },
      moneda: datos.negocio.moneda,
      porPagina: Number(datos.catalogo.layout),
      paleta: datos.tema.palette,
      fuenteTitulo: datos.tema.fonts?.title ?? 'Georgia, serif',
      fondos: {},
    }
  }

  get total() {
    return this.paginas.length
  }
  get color() {
    return this.datos.tema.palette.background
  }
  producto(id: string) {
    return this.productos.get(id)
  }

  /** Las URLs firmadas duran 10 min: si están por vencer, pide datos frescos (sólo URLs). */
  private async urlsVigentes() {
    if (this.datos.caduca - Date.now() / 1000 > 45) return
    this.renovando ??= pedirVisor(this.slug)
      .then((d) => {
        this.datos = d
        d.productos.forEach((p) => this.productos.set(p.id, p))
      })
      .finally(() => (this.renovando = null))
    await this.renovando
  }

  /** Bitmap por clave estable (no por URL: la firma cambia). */
  private bitmap(clave: string, url: () => string): Promise<ImageBitmap | undefined> {
    if (!this.bitmaps.has(clave)) {
      const p = (async () => {
        const u = url()
        if (!u) return undefined
        if (u.startsWith('/api/r/')) await this.urlsVigentes()
        return decodificar(url()).catch(() => undefined)
      })()
      this.bitmaps.set(clave, p)
    }
    return this.bitmaps.get(clave)!
  }

  /** Render (480 o 960) de un color de un producto. */
  render(productoId: string, color: string, tam: '480' | '960') {
    return this.bitmap(`r:${productoId}:${color}:${tam}`, () => {
      const c = this.productos.get(productoId)?.colores.find((x) => x.name === color)
      return c ? (tam === '480' ? c.r480 : c.r960) : ''
    })
  }

  private async preparar(p: PaginaPintable): Promise<PaginaPintable> {
    const tipo: FondoPagina = p.tipo === 'portada' ? 'cover' : p.tipo === 'separador' ? 'divider' : p.tipo === 'productos' ? 'products' : p.tipo === 'especial' ? 'promo' : p.tipo === 'relleno' ? 'filler' : 'back'
    const [fondo, logo] = await Promise.all([this.bitmap(`f:${tipo}`, () => this.datos.tema.fondos[tipo]), this.bitmap('logo', () => this.datos.negocio.logo)])
    this.contexto.fondos[tipo] = fondo
    this.contexto.negocio.logo = logo
    if (p.tipo === 'productos') {
      const tam = this.contexto.porPagina === 1 ? '960' : '480'
      const productos = await Promise.all(p.productos.map(async (pr) => ({ ...pr, render: pr.colores[0] ? await this.render(pr.id, pr.colores[0].name, tam) : undefined })))
      return { ...p, productos }
    }
    if (p.tipo === 'especial') {
      const img = this.datos.especiales.find((e) => e.id === p.especial.id)?.image ?? ''
      return { ...p, especial: { ...p.especial, imagen: await this.bitmap(`e:${p.especial.id}`, () => img) } }
    }
    return p
  }

  /** Página i pintada en un canvas w×h (en caché; se guardan pocas). */
  lienzo(i: number, w: number, h: number): Promise<HTMLCanvasElement> {
    const clave = `${i}:${w}x${h}`
    if (!this.lienzos.has(clave)) {
      this.lienzos.set(
        clave,
        this.preparar(this.paginas[i]).then(async (p) => {
          await document.fonts.ready
          const c = document.createElement('canvas')
          c.width = w
          c.height = h
          pintarPagina(c.getContext('2d')!, w, h, p, this.contexto)
          return c
        }),
      )
      this.orden.push(clave)
      while (this.orden.length > 10) this.lienzos.delete(this.orden.shift()!)
    }
    return this.lienzos.get(clave)!
  }
}
