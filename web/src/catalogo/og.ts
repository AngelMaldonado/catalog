// Imagen para compartir (Open Graph, 1200×630), enfocada a vender (hilo «Imagen para redes que
// vende»): el fondo de la portada adaptado a horizontal y encima los elementos de og_layout
// (plantilla o personalizada): mockups, título, logo en una esquina, «desde $X». Se genera al
// publicar y desde el editor «Imagen para redes».
import type { Libro } from './libro'
import type { ContextoPintado } from './pintar'
import { cantidadOg, elementosDe, ogInicial, pintarElementos, type DisenoOg, type Recursos } from './lienzo'

export const OG_W = 1200
export const OG_H = 630

const dinero = (n: number, moneda: string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda || 'MXN', maximumFractionDigits: 0 }).format(n)

/** Fondo: la portada es vertical; su mitad izquierda va al borde izquierdo y la derecha al
 *  derecho (cada adorno aparece una vez); el centro se rellena con el color liso del centro de
 *  la portada y las orillas interiores se funden con él (estirar la portada dejaba rayas). */
export function pintarFondoOg(ctx: CanvasRenderingContext2D, W: number, H: number, c: ContextoPintado) {
  ctx.fillStyle = c.paleta.background
  ctx.fillRect(0, 0, W, H)
  const f = c.fondos.cover
  if (!f) return
  const muestra = document.createElement('canvas')
  muestra.width = muestra.height = 1
  const m = muestra.getContext('2d', { willReadFrequently: true })!
  m.drawImage(f, f.width * 0.45, f.height * 0.45, f.width * 0.1, f.height * 0.1, 0, 0, 1, 1)
  const [r, g, b] = m.getImageData(0, 0, 1, 1).data
  const liso = `rgb(${r},${g},${b})`
  ctx.fillStyle = liso
  ctx.fillRect(0, 0, W, H)
  const mitad = (f.width / 2) * (H / f.height)
  ctx.drawImage(f, 0, 0, f.width / 2, f.height, 0, 0, mitad, H)
  ctx.drawImage(f, f.width / 2, 0, f.width / 2, f.height, W - mitad, 0, mitad, H)
  const fundido = (110 / 1200) * W
  for (const [x0, x1] of [[mitad - fundido, mitad], [W - mitad + fundido, W - mitad]]) {
    const gr = ctx.createLinearGradient(x0, 0, x1, 0)
    gr.addColorStop(0, `rgba(${r},${g},${b},0)`)
    gr.addColorStop(1, liso)
    ctx.fillStyle = gr
    ctx.fillRect(Math.min(x0, x1), 0, fundido, H)
  }
}

/** Productos del catálogo en el orden del libro (los «primeros» son los de las primeras páginas). */
export const productosDelLibro = (libro: Libro) => libro.paginas.flatMap((p) => (p.tipo === 'productos' ? p.productos : []))

/** Ids de los productos que muestra la imagen: los elegidos o los primeros del catálogo. */
export function idsProductosOg(libro: Libro, d: DisenoOg): string[] {
  const n = cantidadOg(d)
  return (d.productos?.length ? d.productos : productosDelLibro(libro).map((p) => p.id)).slice(0, n)
}

/** Lo que el pintor necesita para la imagen (con los renders grandes de los productos). */
export async function recursosOg(libro: Libro, d: DisenoOg): Promise<Recursos> {
  const c = libro.contexto
  const ids = idsProductosOg(libro, d)
  const precios = productosDelLibro(libro).filter((p) => ids.includes(p.id)).map((p) => p.price)
  const todos = productosDelLibro(libro).map((p) => p.price)
  const desde = Math.min(...(precios.length ? precios : todos))
  return {
    logo: c.negocio.logo,
    productos: await Promise.all(ids.map((pid) => libro.grandeDe(pid))),
    tinta: c.paleta.ink,
    acento: c.paleta.accent,
    fuenteTitulo: c.fuenteTitulo,
    fuenteTexto: c.fuenteTexto,
    textos: { negocio: c.negocio.nombre, titulo: c.catalogo, subtitulo: '', precio: Number.isFinite(desde) ? `Desde ${dinero(desde, c.moneda)}` : '' },
  }
}

export async function imagenOg(libro: Libro, diseno?: DisenoOg): Promise<Blob> {
  const d = diseno ?? libro.catalogo.og_layout ?? ogInicial()
  const lienzo = document.createElement('canvas')
  lienzo.width = OG_W
  lienzo.height = OG_H
  const ctx = lienzo.getContext('2d')!
  await document.fonts.ready
  pintarFondoOg(ctx, OG_W, OG_H, libro.contexto)
  pintarElementos(ctx, OG_W, OG_H, elementosDe(d), await recursosOg(libro, d))
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('og'))), 'image/jpeg', 0.85))
}

/** Título y descripción que el servidor pone en las etiquetas Open Graph: deben coincidir con
 *  `indexConMeta` en pb/pb_hooks/lib/visor.js (los previews de «Compartir» los muestran). */
export function textosOg(catalogo: string, negocio: string) {
  return { titulo: `${catalogo} · ${negocio}`, descripcion: `Catálogo de ${negocio}. Hojéalo y pide por WhatsApp.` }
}
