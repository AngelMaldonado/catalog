// Imagen para compartir (Open Graph, 1200×630): el fondo de la portada recortado al centro, con
// el nombre del catálogo y del negocio. Se genera al publicar.
import type { Libro } from './libro'

export async function imagenOg({ contexto: c }: Libro): Promise<Blob> {
  const W = 1200
  const H = 630
  const lienzo = document.createElement('canvas')
  lienzo.width = W
  lienzo.height = H
  const ctx = lienzo.getContext('2d')!
  ctx.fillStyle = c.paleta.background
  ctx.fillRect(0, 0, W, H)
  const f = c.fondos.cover
  if (f) {
    // la portada es vertical: su mitad izquierda va al borde izquierdo y la derecha al derecho
    // (cada adorno aparece una vez); el centro se rellena con el color liso del centro de la
    // portada y las orillas interiores se funden con él (estirar la portada dejaba rayas)
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
    const fundido = 110
    for (const [x0, x1] of [[mitad - fundido, mitad], [W - mitad + fundido, W - mitad]]) {
      const gr = ctx.createLinearGradient(x0, 0, x1, 0)
      gr.addColorStop(0, `rgba(${r},${g},${b},0)`)
      gr.addColorStop(1, liso)
      ctx.fillStyle = gr
      ctx.fillRect(Math.min(x0, x1), 0, fundido, H)
    }
  }
  await document.fonts.ready
  ctx.textAlign = 'center'
  ctx.fillStyle = c.paleta.ink
  ctx.font = `600 34px Inter Variable, system-ui, sans-serif`
  ctx.fillText(c.negocio.nombre.toUpperCase(), W / 2, H * 0.38)
  ctx.font = `400 96px ${c.fuenteTitulo}`
  ctx.fillText(c.catalogo, W / 2, H * 0.58, W * 0.86)
  return new Promise((ok, mal) => lienzo.toBlob((b) => (b ? ok(b) : mal(new Error('og'))), 'image/jpeg', 0.85))
}
