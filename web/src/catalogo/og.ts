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
    // (cada adorno aparece una vez) y la franja central, lisa, se estira en medio
    const mitad = (f.width / 2) * (H / f.height)
    ctx.drawImage(f, 0, 0, f.width / 2, f.height, 0, 0, mitad, H)
    ctx.drawImage(f, f.width / 2, 0, f.width / 2, f.height, W - mitad, 0, mitad, H)
    ctx.drawImage(f, f.width * 0.47, 0, f.width * 0.06, f.height, mitad - 1, 0, W - 2 * mitad + 2, H)
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
