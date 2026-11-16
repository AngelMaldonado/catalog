// Pintor de páginas del catálogo en canvas: UNO para la vista previa del admin y para el visor
// (hoja rígida y página realista; decidido en «Visor público»). Las páginas son 9:16 y todo se
// mide relativo al ancho, así se ve igual a cualquier resolución.
import type { FondoPagina } from '../lib/types'
import type { Pagina } from './maquetar'
import { contactoDe, pintarElementos, type DisenoPortada, type Recursos } from './lienzo'

export interface ProductoPintable {
  id: string
  category: string
  sort: number
  name: string
  price: number
  colores: { name: string; hex: string }[]
  render?: ImageBitmap
}
export interface EspecialPintable {
  id: string
  position: number
  created: string
  kind: 'promo' | 'image'
  title: string
  body: string
  imagen?: ImageBitmap
}
export type PaginaPintable = Pagina<ProductoPintable, EspecialPintable>

export interface ContextoPintado {
  catalogo: string
  negocio: { nombre: string; logo?: ImageBitmap; whatsapp: string; instagram: string; facebook: string; tiktok: string; direccion: string }
  moneda: string
  /** productos por página del catálogo: fija la cuadrícula aunque la última página venga incompleta */
  porPagina: number
  paleta: { background: string; ink: string; accent: string }
  fuenteTitulo: string
  /** el resto del texto de las páginas: la fuente elegida para el catálogo, o Inter */
  fuenteTexto: string
  fondos: Partial<Record<FondoPagina, ImageBitmap>>
  /** lo que va detrás de cada producto en las páginas (ya no hay tarjeta) */
  realce: Realce
  /** portada editada (catalogo/lienzo.ts) y los renders de sus productos destacados */
  portada?: { diseno: DisenoPortada; productos: (ImageBitmap | undefined)[] }
  /** contraportada editada (mismo modelo) */
  contraportada?: { diseno: DisenoPortada; productos: (ImageBitmap | undefined)[] }
}

const fondoDe = (p: PaginaPintable): FondoPagina =>
  p.tipo === 'portada' ? 'cover' : p.tipo === 'separador' ? 'divider' : p.tipo === 'productos' ? 'products' : p.tipo === 'especial' ? 'promo' : p.tipo === 'relleno' ? 'filler' : 'back'

export function cubrir(ctx: CanvasRenderingContext2D, img: ImageBitmap, x: number, y: number, w: number, h: number, modo: 'cover' | 'contain') {
  const s = modo === 'cover' ? Math.max(w / img.width, h / img.height) : Math.min(w / img.width, h / img.height)
  const dw = img.width * s
  const dh = img.height * s
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh)
  ctx.restore()
}

/** Parte un texto en renglones que caben en `ancho`; recorta con «…» si pasa de `max`. */
export function renglones(ctx: CanvasRenderingContext2D, texto: string, ancho: number, max = 99): string[] {
  const out: string[] = []
  let linea = ''
  for (const palabra of texto.split(/\s+/).filter(Boolean)) {
    const prueba = linea ? `${linea} ${palabra}` : palabra
    if (ctx.measureText(prueba).width <= ancho || !linea) linea = prueba
    else {
      out.push(linea)
      linea = palabra
    }
  }
  if (linea) out.push(linea)
  if (out.length > max) {
    out.length = max
    out[max - 1] = out[max - 1].replace(/\s*\S*$/, '') + '…'
  }
  return out
}

const precio = (n: number, moneda: string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda || 'MXN', maximumFractionDigits: 0 }).format(n)

/** Lo que la contraportada editada pinta: el título lleva el nombre del negocio y el
 *  subtítulo es el mensaje libre. */
export function recursosContra(c: ContextoPintado, diseno: DisenoPortada, productos: (ImageBitmap | undefined)[]): Recursos {
  return {
    logo: c.negocio.logo, productos, tinta: c.paleta.ink, acento: c.paleta.accent, fuenteTitulo: c.fuenteTitulo, fuenteTexto: c.fuenteTexto,
    textos: { negocio: '', titulo: c.negocio.nombre, subtitulo: diseno.subtitulo, precio: '', contacto: contactoDe(c.negocio), direccion: c.negocio.direccion },
  }
}

/** Fondo de una página (color del tema + su imagen) bajo los elementos del editor. */
export function pintarFondoDe(ctx: CanvasRenderingContext2D, w: number, h: number, c: ContextoPintado, fondo: 'cover' | 'back') {
  ctx.fillStyle = c.paleta.background
  ctx.fillRect(0, 0, w, h)
  const img = c.fondos[fondo]
  if (img) cubrir(ctx, img, 0, 0, w, h, 'cover')
}

/** Fondo de la portada (color del tema + su imagen): lo que el editor pinta bajo los elementos. */
export function pintarFondoPortada(ctx: CanvasRenderingContext2D, w: number, h: number, c: ContextoPintado) {
  ctx.fillStyle = c.paleta.background
  ctx.fillRect(0, 0, w, h)
  if (c.fondos.cover) cubrir(ctx, c.fondos.cover, 0, 0, w, h, 'cover')
}

export function pintarPagina(ctx: CanvasRenderingContext2D, w: number, h: number, p: PaginaPintable, c: ContextoPintado) {
  const u = w / 100 // unidad: 1 % del ancho
  ctx.save()
  ctx.fillStyle = c.paleta.background
  ctx.fillRect(0, 0, w, h)
  const fondo = c.fondos[fondoDe(p)]
  if (fondo) cubrir(ctx, fondo, 0, 0, w, h, 'cover')
  ctx.fillStyle = c.paleta.ink
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  const titulo = (px: number) => `400 ${Math.round(px)}px ${c.fuenteTitulo}`
  const cuerpo = (px: number, peso = 500) => `${peso} ${Math.round(px)}px ${c.fuenteTexto}`

  if (p.tipo === 'portada' && c.portada) {
    const { diseno, productos } = c.portada
    pintarElementos(ctx, w, h, diseno.elementos, {
      logo: c.negocio.logo, productos, tinta: c.paleta.ink, acento: c.paleta.accent, fuenteTitulo: c.fuenteTitulo, fuenteTexto: c.fuenteTexto,
      textos: { negocio: c.negocio.nombre, titulo: c.catalogo, subtitulo: diseno.subtitulo, precio: '' },
    })
  } else if (p.tipo === 'portada') {
    const base = h * 0.47 // primera línea del título
    // con logo, la marca se apila hacia arriba desde el título: nombre a 16u y el logo encima
    const nombreY = c.negocio.logo ? base - 16 * u : h * 0.3
    if (c.negocio.logo) cubrir(ctx, c.negocio.logo, w / 2 - 11 * u, nombreY - 30 * u, 22 * u, 22 * u, 'contain')
    ctx.font = cuerpo(4.2 * u, 600)
    ctx.fillText(c.negocio.nombre.toUpperCase(), w / 2, nombreY)
    ctx.font = titulo(13 * u)
    renglones(ctx, c.catalogo, 76 * u, 3).forEach((l, i) => ctx.fillText(l, w / 2, base + i * 14 * u))
  } else if (p.tipo === 'separador') {
    ctx.font = titulo(14 * u)
    renglones(ctx, p.seccion.nombre, 76 * u, 2).forEach((l, i) => ctx.fillText(l, w / 2, h * 0.52 + i * 15 * u))
  } else if (p.tipo === 'productos') {
    tarjetas(ctx, w, h, u, p.productos, c)
  } else if (p.tipo === 'especial') {
    const e = p.especial
    if (e.kind === 'image' && e.imagen) cubrir(ctx, e.imagen, 0, 0, w, h, 'cover')
    else {
      let y = h * 0.36
      if (e.imagen) {
        cubrir(ctx, e.imagen, 12 * u, h * 0.16, 76 * u, h * 0.3, 'contain')
        y = h * 0.56
      }
      ctx.font = titulo(12 * u)
      renglones(ctx, e.title, 78 * u, 3).forEach((l) => {
        ctx.fillText(l, w / 2, y)
        y += 12.5 * u
      })
      ctx.font = cuerpo(4.6 * u)
      y += 2 * u
      renglones(ctx, e.body, 74 * u, 6).forEach((l) => {
        ctx.fillText(l, w / 2, y)
        y += 6.4 * u
      })
    }
  } else if (p.tipo === 'contraportada' && c.contraportada) {
    const { diseno, productos } = c.contraportada
    pintarElementos(ctx, w, h, diseno.elementos, recursosContra(c, diseno, productos))
  } else if (p.tipo === 'contraportada') {
    let y = h * 0.2
    if (c.negocio.logo) {
      cubrir(ctx, c.negocio.logo, w / 2 - 10 * u, y - 4 * u, 20 * u, 20 * u, 'contain')
      y += 24 * u
    }
    ctx.font = titulo(11 * u)
    ctx.fillText(c.negocio.nombre, w / 2, y + 8 * u)
    ctx.font = cuerpo(4.8 * u, 600)
    const datos = [
      c.negocio.whatsapp && `WhatsApp ${c.negocio.whatsapp}`,
      c.negocio.instagram && 'Instagram',
      c.negocio.facebook && 'Facebook',
      c.negocio.tiktok && 'TikTok',
    ].filter(Boolean) as string[]
    y += 20 * u
    for (const d of datos) {
      ctx.fillText(d, w / 2, y)
      y += 7.5 * u
    }
    if (c.negocio.direccion) {
      ctx.font = cuerpo(4 * u)
      renglones(ctx, c.negocio.direccion, 74 * u, 3).forEach((l) => {
        y += 6 * u
        ctx.fillText(l, w / 2, y)
      })
    }
  }
  ctx.restore()
}

/** Rectángulos de las tarjetas de producto en una página w×h con `porPagina` lugares. Los usa el
 *  pintor y la capa de toque del visor (para saber qué producto se tocó). */
export function rectsTarjetas(w: number, h: number, porPagina: number): { x: number; y: number; w: number; h: number }[] {
  const u = w / 100
  const n = Math.max(porPagina, 1)
  const cols = n > 2 ? 2 : 1
  const filas = n > 1 ? 2 : 1
  const mx = 7 * u
  const top = h * 0.08
  const bottom = h * 0.06
  const gap = 4 * u
  const cw = (w - 2 * mx - gap * (cols - 1)) / cols
  const ch = (h - top - bottom - gap * (filas - 1)) / filas
  return Array.from({ length: n }, (_, k) => ({ x: mx + (k % cols) * (cw + gap), y: top + Math.floor(k / cols) * (ch + gap), w: cw, h: ch }))
}

/** La fuente de texto cuando el catálogo usa la del tema. */
export const INTER = 'Inter Variable, system-ui, sans-serif'

export type Realce = 'brillo' | 'disco' | 'sombra' | 'aro' | 'ninguno'
export const REALCES: { id: Realce; nombre: string }[] = [
  { id: 'brillo', nombre: 'Brillo' },
  { id: 'disco', nombre: 'Círculo' },
  { id: 'aro', nombre: 'Aro' },
  { id: 'sombra', nombre: 'Sombra' },
  { id: 'ninguno', nombre: 'Nada' },
]
/** Los renders traen margen transparente (la prenda ocupa ~80 % del cuadro): sin tarjeta, se
 *  dibujan más grandes que su zona para que la prenda la llene. */
const ZOOM = 1.22

/** Lo que va detrás de la prenda, centrado en (cx, cy), para una zona de lado `lado`. */
function pintarRealce(ctx: CanvasRenderingContext2D, tipo: Realce, cx: number, cy: number, lado: number, c: ContextoPintado) {
  const r = lado * 0.42
  ctx.save()
  if (tipo === 'brillo') {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 1.15)
    g.addColorStop(0, 'rgba(255,255,255,0.9)')
    g.addColorStop(0.55, 'rgba(255,255,255,0.5)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(cx, cy, r * 1.15, 0, Math.PI * 2)
    ctx.fill()
  } else if (tipo === 'disco' || tipo === 'aro') {
    ctx.globalAlpha = tipo === 'disco' ? 0.22 : 0.5
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    if (tipo === 'disco') {
      ctx.fillStyle = c.paleta.accent
      ctx.fill()
    } else {
      ctx.strokeStyle = c.paleta.accent
      ctx.lineWidth = lado * 0.014
      ctx.stroke()
    }
  } else if (tipo === 'sombra') {
    // sombra de contacto bajo la prenda: la asienta en la página
    const sy = cy + lado * 0.4
    ctx.translate(cx, sy)
    ctx.scale(1, 0.16)
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, lado * 0.34)
    g.addColorStop(0, 'rgba(0,0,0,0.32)')
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(0, 0, lado * 0.34, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

function tarjetas(ctx: CanvasRenderingContext2D, w: number, h: number, u: number, productos: ProductoPintable[], c: ContextoPintado) {
  const rects = rectsTarjetas(w, h, Math.max(c.porPagina, 1))
  productos.forEach((p, k) => pintarProducto(ctx, rects[k], u, p, c))
}

/** Un producto en su celda: realce, prenda, y al pie nombre, precio y colores en la tinta del
 *  tema (sin tarjeta debajo). También lo usa la muestra del realce en Ajustes. */
export function pintarProducto(ctx: CanvasRenderingContext2D, rect: { x: number; y: number; w: number; h: number }, u: number, p: ProductoPintable, c: ContextoPintado) {
  const n = Math.max(c.porPagina, 1)
  const { x, y, w: cw, h: ch } = rect
  const pie = (n === 4 ? 11 : 10) * u
  // zona de la imagen: todo menos el pie, con la prenda centrada y su realce detrás
  const lado = Math.min(cw, ch - pie)
  const cx = x + cw / 2
  const cy = y + (ch - pie) / 2
  pintarRealce(ctx, c.realce, cx, cy, lado, c)
  if (p.render) {
    const L = lado * ZOOM
    ctx.drawImage(p.render, cx - L / 2, cy - L / 2, L, L)
  }
  const fs = (n === 4 ? 3.8 : 4.6) * u
  ctx.fillStyle = c.paleta.ink
  ctx.textAlign = 'left'
  ctx.font = `600 ${Math.round(fs)}px ${c.fuenteTexto}`
  const nombre = renglones(ctx, p.name, cw - 2 * u, 1)[0] ?? ''
  ctx.fillText(nombre, x + 1 * u, y + ch - pie + fs + 0.5 * u)
  ctx.font = `700 ${Math.round(fs)}px ${c.fuenteTexto}`
  ctx.fillText(precio(p.price, c.moneda), x + 1 * u, y + ch - pie + 2 * fs + 2 * u)
  const r = (n === 4 ? 1.5 : 1.9) * u
  p.colores.slice(0, 7).forEach((col, i) => {
    ctx.beginPath()
    ctx.arc(x + cw - 1 * u - r - i * (2 * r + 1.2 * u), y + ch - pie + 2 * fs + 0.7 * u, r, 0, Math.PI * 2)
    ctx.fillStyle = col.hex
    ctx.fill()
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'
    ctx.lineWidth = 0.25 * u
    ctx.stroke()
  })
}
