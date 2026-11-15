// Lado del navegador del compositor: cargar capas e imágenes a arreglos, validar diseños y
// exportar los renders (WebP 960 y 480, con marca de agua sutil del negocio).
import { pb } from '../pb'
import type { Cuad } from './homografia'
import { componer, type Arte, type Colocacion } from './componer'
import type { GarmentTemplate } from '../types'

export const RENDER = 960

function lienzo(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

async function bitmapDe(src: string | Blob): Promise<ImageBitmap> {
  const blob = typeof src === 'string' ? await (await fetch(src)).blob() : src
  return createImageBitmap(blob)
}

/** Un canal (R) de una imagen escalada a size × size. */
async function canal(url: string, size: number): Promise<Uint8ClampedArray> {
  const bmp = await bitmapDe(url)
  const c = lienzo(size, size)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bmp, 0, 0, size, size)
  const rgba = ctx.getImageData(0, 0, size, size).data
  const out = new Uint8ClampedArray(size * size)
  for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4]
  return out
}

export interface Capas {
  size: number
  sombreado: Uint8ClampedArray
  mascara: Uint8ClampedArray
  area: Cuad
}

const cacheCapas = new Map<string, Promise<Capas>>()
/** Sombreado y máscara de una plantilla al tamaño pedido (en caché). */
export function capasDe(t: GarmentTemplate, size = RENDER): Promise<Capas> {
  const key = `${t.id}:${t.updated}:${size}`
  if (!cacheCapas.has(key)) {
    cacheCapas.set(
      key,
      Promise.all([canal(pb.files.getURL(t, t.shadow), size), canal(pb.files.getURL(t, t.mask), size)]).then(([sombreado, mascara]) => ({
        size,
        sombreado,
        mascara,
        area: t.print_area,
      })),
    )
  }
  return cacheCapas.get(key)!
}

export interface DisenoLeido {
  arte: Arte
  w: number
  h: number
  avisos: string[]
}

/** Lee un diseño (PNG/WebP) a RGBA, reducido a ≤ 1600 px para componer, y lo valida. */
export async function leerDiseno(archivo: Blob): Promise<DisenoLeido> {
  const bmp = await bitmapDe(archivo)
  const avisos: string[] = []
  const largo = Math.max(bmp.width, bmp.height)
  if (largo < 1000) avisos.push(`Resolución baja (${bmp.width}×${bmp.height}): se recomienda al menos 1000 px por lado; puede verse borroso.`)
  const k = Math.min(1, 1600 / largo)
  const w = Math.max(1, Math.round(bmp.width * k))
  const h = Math.max(1, Math.round(bmp.height * k))
  const c = lienzo(w, h)
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(bmp, 0, 0, w, h)
  const rgba = ctx.getImageData(0, 0, w, h).data
  let transparentes = 0
  for (let i = 3; i < rgba.length; i += 16) if (rgba[i] < 250) transparentes++
  if (transparentes / (rgba.length / 16) < 0.02) avisos.push('El archivo no tiene fondo transparente: se estampará también su fondo.')
  return { arte: { rgba, w, h }, w: bmp.width, h: bmp.height, avisos }
}

export const hexARgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Compone a un canvas del tamaño de las capas. */
export function componerEnLienzo(capas: Capas, hex: string, diseno?: Arte, colocacion?: Colocacion): HTMLCanvasElement {
  const px = componer({ ...capas, tinte: hexARgb(hex), arte: diseno, colocacion })
  const c = lienzo(capas.size, capas.size)
  c.getContext('2d')!.putImageData(new ImageData(px, capas.size, capas.size), 0, 0)
  return c
}

function marcaDeAgua(c: HTMLCanvasElement, texto: string) {
  const ctx = c.getContext('2d')!
  const fs = Math.round(c.width * 0.026)
  ctx.save()
  ctx.font = `600 ${fs}px Inter Variable, system-ui, sans-serif`
  ctx.textAlign = 'right'
  ctx.textBaseline = 'bottom'
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.fillText(texto, c.width - fs * 0.8, c.height - fs * 0.6)
  ctx.restore()
}

const aBlob = (c: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((ok, mal) => c.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo codificar la imagen'))), 'image/webp', quality))

/** Render público: 960 y 480 px, WebP q≈0.8 (PNG si el navegador no codifica WebP), con marca de agua. */
export async function exportarRender(c960: HTMLCanvasElement, marca: string): Promise<{ r960: Blob; r480: Blob }> {
  const grande = lienzo(c960.width, c960.height)
  grande.getContext('2d')!.drawImage(c960, 0, 0)
  marcaDeAgua(grande, marca)
  const chico = lienzo(480, 480)
  const ctx = chico.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(c960, 0, 0, 480, 480)
  marcaDeAgua(chico, marca)
  return { r960: await aBlob(grande, 0.8), r480: await aBlob(chico, 0.8) }
}
