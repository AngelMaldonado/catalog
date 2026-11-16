// Lienzo de elementos movibles: la portada del catálogo (hilo «Editor de portada») y la imagen
// para redes (hilo «Imagen para redes que vende») se describen como una lista de elementos con
// posición y tamaño, y se pintan aquí. El mismo pintor sirve al visor, a la vista previa del
// admin, a la imagen Open Graph y al editor (que usa las cajas que devuelve para tocarlos).
//
// Coordenadas normalizadas: x, y = centro del elemento (0–1 del ancho y del alto); s = tamaño
// relativo al ANCHO (imágenes: lado del cuadro que las contiene; textos: tamaño de letra);
// ancho = ancho máximo de un texto antes de partirlo en renglones (relativo al ancho).
import { renglones } from './pintar'

export type IdElemento = 'logo' | 'negocio' | 'titulo' | 'subtitulo' | 'precio' | 'contacto' | 'direccion' | 'producto1' | 'producto2' | 'producto3' | 'producto4' | 'producto5' | 'producto6'
export const PRODUCTOS: IdElemento[] = ['producto1', 'producto2', 'producto3', 'producto4', 'producto5', 'producto6']

export interface Elemento {
  id: IdElemento
  visible: boolean
  x: number
  y: number
  s: number
  ancho?: number
}

export interface Recursos {
  logo?: ImageBitmap
  /** en el orden de producto1…producto6 */
  productos: (ImageBitmap | undefined)[]
  /** contacto: un renglón por medio (WhatsApp, redes), separados por \n */
  textos: { negocio: string; titulo: string; subtitulo: string; precio: string; contacto?: string; direccion?: string }
  tinta: string
  acento: string
  fuenteTitulo: string
  /** el resto de los textos (la fuente elegida para el catálogo, o Inter) */
  fuenteTexto: string
}

/** Caja de un elemento pintado, normalizada (para tocarlo en el editor). */
export interface Caja {
  id: IdElemento
  x0: number
  y0: number
  x1: number
  y1: number
}

export const NOMBRES: Record<IdElemento, string> = {
  logo: 'Logo', negocio: 'Nombre del negocio', titulo: 'Título', subtitulo: 'Subtítulo', precio: 'Precio «desde»', contacto: 'Contacto', direccion: 'Dirección',
  producto1: 'Producto 1', producto2: 'Producto 2', producto3: 'Producto 3', producto4: 'Producto 4', producto5: 'Producto 5', producto6: 'Producto 6',
}

/** Rango del control de tamaño por tipo de elemento. */
export const rangoTamano = (id: IdElemento): [number, number] =>
  id === 'logo' ? [0.05, 0.5] : id.startsWith('producto') ? [0.1, 0.8] : id === 'titulo' ? [0.03, 0.2] : [0.015, 0.09]

function contener(ctx: CanvasRenderingContext2D, img: ImageBitmap, cx: number, cy: number, lado: number) {
  const k = Math.min(lado / img.width, lado / img.height)
  const w = img.width * k
  const h = img.height * k
  ctx.drawImage(img, cx - w / 2, cy - h / 2, w, h)
  return { w, h }
}

/** Pinta los elementos visibles sobre lo que ya tenga el contexto y devuelve sus cajas. */
export function pintarElementos(ctx: CanvasRenderingContext2D, W: number, H: number, elementos: Elemento[], r: Recursos): Caja[] {
  const cajas: Caja[] = []
  const caja = (id: IdElemento, cx: number, cy: number, w: number, h: number) =>
    cajas.push({ id, x0: (cx - w / 2) / W, y0: (cy - h / 2) / H, x1: (cx + w / 2) / W, y1: (cy + h / 2) / H })
  ctx.save()
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  for (const e of elementos) {
    if (!e.visible) continue
    const cx = e.x * W
    const cy = e.y * H
    const t = e.s * W
    if (e.id === 'logo' || e.id.startsWith('producto')) {
      const img = e.id === 'logo' ? r.logo : r.productos[PRODUCTOS.indexOf(e.id)]
      if (!img) continue
      const { w, h } = contener(ctx, img, cx, cy, t)
      caja(e.id, cx, cy, w, h)
      continue
    }
    const texto = e.id === 'negocio' ? r.textos.negocio.toUpperCase() : (r.textos[e.id as 'titulo' | 'subtitulo' | 'precio' | 'contacto' | 'direccion'] ?? '')
    if (!texto.trim()) continue
    const texto2 = `${t}px ${r.fuenteTexto}`
    ctx.font = e.id === 'titulo' ? `400 ${t}px ${r.fuenteTitulo}` : e.id === 'precio' ? `700 ${texto2}` : `${e.id === 'negocio' || e.id === 'contacto' ? 600 : 500} ${texto2}`
    if (e.id === 'precio') {
      // pastilla del color de acento: el «desde $X» tiene que saltar a la vista
      const w = ctx.measureText(texto).width + t * 1.4
      const h = t * 1.9
      ctx.fillStyle = r.acento
      ctx.beginPath()
      ctx.roundRect(cx - w / 2, cy - h / 2, w, h, h / 2)
      ctx.fill()
      ctx.fillStyle = '#ffffff'
      ctx.fillText(texto, cx, cy + t * 0.05)
      caja(e.id, cx, cy, w, h)
      continue
    }
    // contacto: un renglón por medio, sin partir; los demás se parten al ancho
    const lineas = e.id === 'contacto' ? texto.split('\n').filter(Boolean) : renglones(ctx, texto, (e.ancho ?? 0.86) * W, e.id === 'titulo' ? 3 : 2)
    const alto = t * (e.id === 'titulo' ? 1.05 : 1.25)
    ctx.fillStyle = r.tinta
    const y0 = cy - ((lineas.length - 1) * alto) / 2
    lineas.forEach((l, i) => ctx.fillText(l, cx, y0 + i * alto))
    const w = Math.max(...lineas.map((l) => ctx.measureText(l).width))
    caja(e.id, cx, cy, w, lineas.length * alto)
  }
  ctx.restore()
  return cajas
}

// ---- portada ------------------------------------------------------------------------------

export interface DisenoPortada {
  elementos: Elemento[]
  subtitulo: string
  /** ids de los productos destacados (producto1…producto3) */
  productos: string[]
}

/** La portada de siempre (logo, nombre y título al centro), como punto de partida del editor. */
export const portadaInicial = (): DisenoPortada => ({
  subtitulo: '',
  productos: [],
  elementos: [
    { id: 'logo', visible: true, x: 0.5, y: 0.25, s: 0.22 },
    { id: 'negocio', visible: true, x: 0.5, y: 0.355, s: 0.042 },
    { id: 'titulo', visible: true, x: 0.5, y: 0.5, s: 0.13, ancho: 0.76 },
    { id: 'subtitulo', visible: false, x: 0.5, y: 0.64, s: 0.045 },
    { id: 'producto1', visible: false, x: 0.2, y: 0.8, s: 0.3 },
    { id: 'producto2', visible: false, x: 0.5, y: 0.8, s: 0.3 },
    { id: 'producto3', visible: false, x: 0.8, y: 0.8, s: 0.3 },
  ],
})

/** Diseños de portada para empezar (el editor parte de uno y luego se mueve a mano). */
export const SUGERENCIAS_PORTADA: { id: string; nombre: string; productos: number; elementos: () => Elemento[] }[] = [
  { id: 'clasica', nombre: 'Clásica', productos: 0, elementos: () => portadaInicial().elementos },
  {
    id: 'vitrina', nombre: 'Vitrina', productos: 3,
    elementos: () => [
      { id: 'logo', visible: true, x: 0.5, y: 0.1, s: 0.16 },
      { id: 'negocio', visible: true, x: 0.5, y: 0.19, s: 0.038 },
      { id: 'titulo', visible: true, x: 0.5, y: 0.31, s: 0.12, ancho: 0.82 },
      { id: 'subtitulo', visible: true, x: 0.5, y: 0.43, s: 0.042 },
      { id: 'producto1', visible: true, x: 0.2, y: 0.74, s: 0.34 },
      { id: 'producto3', visible: true, x: 0.8, y: 0.74, s: 0.34 },
      { id: 'producto2', visible: true, x: 0.5, y: 0.68, s: 0.42 },
    ],
  },
  {
    id: 'protagonista', nombre: 'Protagonista', productos: 1,
    elementos: () => [
      { id: 'logo', visible: true, x: 0.14, y: 0.07, s: 0.14 },
      { id: 'negocio', visible: true, x: 0.5, y: 0.13, s: 0.04 },
      { id: 'producto1', visible: true, x: 0.5, y: 0.44, s: 0.88 },
      { id: 'titulo', visible: true, x: 0.5, y: 0.78, s: 0.12, ancho: 0.84 },
      { id: 'subtitulo', visible: true, x: 0.5, y: 0.9, s: 0.042 },
    ],
  },
  {
    id: 'collage', nombre: 'Collage', productos: 2,
    elementos: () => [
      { id: 'producto1', visible: true, x: 0.33, y: 0.28, s: 0.6 },
      { id: 'producto2', visible: true, x: 0.67, y: 0.38, s: 0.6 },
      { id: 'negocio', visible: true, x: 0.5, y: 0.6, s: 0.038 },
      { id: 'titulo', visible: true, x: 0.5, y: 0.7, s: 0.13, ancho: 0.84 },
      { id: 'subtitulo', visible: true, x: 0.5, y: 0.81, s: 0.042 },
      { id: 'logo', visible: true, x: 0.5, y: 0.91, s: 0.12 },
    ],
  },
  {
    id: 'minimal', nombre: 'Minimal', productos: 0,
    elementos: () => [
      { id: 'logo', visible: true, x: 0.5, y: 0.14, s: 0.16 },
      { id: 'titulo', visible: true, x: 0.5, y: 0.48, s: 0.17, ancho: 0.86 },
      { id: 'subtitulo', visible: true, x: 0.5, y: 0.62, s: 0.05 },
      { id: 'negocio', visible: true, x: 0.5, y: 0.9, s: 0.036 },
    ],
  },
]

/** Aplica una sugerencia: sus elementos (más los que no usa, ocultos), con productos elegidos o
 *  los primeros del catálogo, y el subtítulo sólo si tiene texto. */
export function aplicarSugerencia(d: DisenoPortada, id: string, primeros: string[], lado: Lado = 'portada'): DisenoPortada {
  const sug = SUGERENCIAS[lado].find((x) => x.id === id)!
  const productos = [...d.productos, ...primeros.filter((p) => !d.productos.includes(p))].slice(0, sug.productos)
  const propios = sug.elementos().map((e) => (e.id === 'subtitulo' ? { ...e, visible: !!d.subtitulo.trim() } : e))
  const resto = INICIAL[lado]().elementos.filter((e) => !propios.some((x) => x.id === e.id)).map((e) => ({ ...e, visible: false }))
  return { ...d, productos, elementos: [...propios, ...resto].map((e) => (PRODUCTOS.indexOf(e.id) >= productos.length ? { ...e, visible: false } : e)) }
}

// ---- contraportada --------------------------------------------------------------------------
// Mismo modelo que la portada: `subtitulo` es el mensaje libre («¡Gracias por tu compra!») y el
// elemento `titulo` lleva el nombre del negocio, en la fuente del título.

/** La contraportada de siempre: logo, nombre, contacto y dirección. */
export const contraInicial = (): DisenoPortada => ({
  subtitulo: '',
  productos: [],
  elementos: [
    { id: 'logo', visible: true, x: 0.5, y: 0.2, s: 0.2 },
    { id: 'titulo', visible: true, x: 0.5, y: 0.35, s: 0.11, ancho: 0.8 },
    { id: 'contacto', visible: true, x: 0.5, y: 0.48, s: 0.048 },
    { id: 'direccion', visible: true, x: 0.5, y: 0.6, s: 0.036, ancho: 0.8 },
    { id: 'subtitulo', visible: false, x: 0.5, y: 0.72, s: 0.05, ancho: 0.8 },
    { id: 'producto1', visible: false, x: 0.2, y: 0.84, s: 0.28 },
    { id: 'producto2', visible: false, x: 0.5, y: 0.84, s: 0.28 },
    { id: 'producto3', visible: false, x: 0.8, y: 0.84, s: 0.28 },
  ],
})

export const SUGERENCIAS_CONTRA: { id: string; nombre: string; productos: number; elementos: () => Elemento[] }[] = [
  { id: 'clasica', nombre: 'Clásica', productos: 0, elementos: () => contraInicial().elementos },
  {
    id: 'gracias', nombre: 'Gracias', productos: 0,
    elementos: () => [
      { id: 'subtitulo', visible: true, x: 0.5, y: 0.3, s: 0.09, ancho: 0.84 },
      { id: 'logo', visible: true, x: 0.5, y: 0.5, s: 0.18 },
      { id: 'titulo', visible: true, x: 0.5, y: 0.63, s: 0.08, ancho: 0.8 },
      { id: 'contacto', visible: true, x: 0.5, y: 0.76, s: 0.042 },
      { id: 'direccion', visible: true, x: 0.5, y: 0.88, s: 0.032, ancho: 0.8 },
    ],
  },
  {
    id: 'productos', nombre: 'Con productos', productos: 3,
    elementos: () => [
      { id: 'logo', visible: true, x: 0.5, y: 0.1, s: 0.16 },
      { id: 'titulo', visible: true, x: 0.5, y: 0.22, s: 0.09, ancho: 0.8 },
      { id: 'producto1', visible: true, x: 0.2, y: 0.43, s: 0.3 },
      { id: 'producto2', visible: true, x: 0.5, y: 0.4, s: 0.34 },
      { id: 'producto3', visible: true, x: 0.8, y: 0.43, s: 0.3 },
      { id: 'contacto', visible: true, x: 0.5, y: 0.66, s: 0.045 },
      { id: 'direccion', visible: true, x: 0.5, y: 0.78, s: 0.034, ancho: 0.8 },
    ],
  },
  {
    id: 'tarjeta', nombre: 'Tarjeta', productos: 0,
    elementos: () => [
      { id: 'logo', visible: true, x: 0.5, y: 0.3, s: 0.42 },
      { id: 'titulo', visible: true, x: 0.5, y: 0.53, s: 0.12, ancho: 0.84 },
      { id: 'contacto', visible: true, x: 0.5, y: 0.75, s: 0.05 },
      { id: 'direccion', visible: true, x: 0.5, y: 0.88, s: 0.034, ancho: 0.8 },
    ],
  },
]

export type Lado = 'portada' | 'contraportada'
export const INICIAL: Record<Lado, () => DisenoPortada> = { portada: portadaInicial, contraportada: contraInicial }
export const SUGERENCIAS: Record<Lado, typeof SUGERENCIAS_PORTADA> = { portada: SUGERENCIAS_PORTADA, contraportada: SUGERENCIAS_CONTRA }

/** Renglones de contacto de la contraportada (los mismos de la clásica). */
export function contactoDe(n: { whatsapp: string; instagram: string; facebook: string; tiktok: string }) {
  return [n.whatsapp && `WhatsApp ${n.whatsapp}`, n.instagram && 'Instagram', n.facebook && 'Facebook', n.tiktok && 'TikTok'].filter(Boolean).join('\n')
}

// ---- imagen para redes (1200 × 630) ------------------------------------------------------

export type PlantillaOg = 'fila' | 'protagonista' | 'cuadricula' | 'portada'
export type EsquinaLogo = 'sup-izq' | 'sup-der' | 'inf-izq' | 'inf-der' | 'ninguna'
/** arriba/abajo (fila), izquierda/derecha (protagonista, cuadrícula), arriba/centro/abajo (portada) */
export type PosicionTitulo = 'arriba' | 'centro' | 'abajo' | 'izquierda' | 'derecha'

export interface DisenoOg {
  plantilla: PlantillaOg
  esquinaLogo: EsquinaLogo
  posTitulo: PosicionTitulo
  /** null = los primeros del catálogo */
  productos: string[] | null
  /** cuántos productos muestra; null = los de la plantilla (ver PLANTILLAS_OG) */
  cantidad?: number | null
  precio: boolean
  /** null = los de la plantilla; si no, la versión personalizada (movida a mano) */
  elementos: Elemento[] | null
}

/** productos: cuántos por defecto; min y max: lo que se puede elegir. */
export const PLANTILLAS_OG: { id: PlantillaOg; nombre: string; productos: number; min: number; max: number; posiciones: PosicionTitulo[] }[] = [
  { id: 'fila', nombre: 'Título y productos', productos: 3, min: 1, max: 5, posiciones: ['arriba', 'abajo'] },
  { id: 'protagonista', nombre: 'Producto protagonista', productos: 1, min: 1, max: 3, posiciones: ['derecha', 'izquierda'] },
  { id: 'cuadricula', nombre: 'Cuadrícula', productos: 4, min: 2, max: 6, posiciones: ['izquierda', 'derecha'] },
  { id: 'portada', nombre: 'Portada', productos: 0, min: 0, max: 4, posiciones: ['centro', 'arriba', 'abajo'] },
]

/** Cuántos productos muestra un diseño: el elegido (dentro del rango de la plantilla) o el suyo. */
export function cantidadOg(d: Pick<DisenoOg, 'plantilla' | 'cantidad'>): number {
  const p = PLANTILLAS_OG.find((x) => x.id === d.plantilla)!
  return Math.max(p.min, Math.min(p.max, d.cantidad ?? p.productos))
}

export const ogInicial = (): DisenoOg => ({ plantilla: 'fila', esquinaLogo: 'sup-izq', posTitulo: 'arriba', productos: null, cantidad: null, precio: true, elementos: null })

const OG_W = 1200
const OG_H = 630
/** Centro de un logo de lado s (relativo al ancho) en una esquina, con margen. */
function esquina(e: EsquinaLogo, s: number): [number, number] {
  const mx = 0.035 + s / 2
  const my = (0.035 * OG_W) / OG_H + (s / 2) * (OG_W / OG_H)
  return [e.endsWith('izq') ? mx : 1 - mx, e.startsWith('sup') ? my : 1 - my]
}

/** Los elementos de una plantilla con sus opciones (antes de moverlos a mano). */
export function elementosOg(d: Omit<DisenoOg, 'elementos'>): Elemento[] {
  const el = (id: IdElemento, x: number, y: number, s: number, ancho?: number): Elemento => ({ id, visible: true, x, y, s, ancho })
  const out: Elemento[] = []
  // bloque de texto (nombre, título, precio) centrado en (x, y)
  const textos = (x: number, y: number, s: number, ancho: number) => {
    out.push(el('negocio', x, y - s * 2.2, 0.024, ancho), el('titulo', x, y, s, ancho))
    if (d.precio) out.push(el('precio', x, y + s * 2.3, 0.024))
  }
  const n = cantidadOg(d)
  /** n productos repartidos a lo ancho entre x0 y x1, a la altura y, de lado ≤ maximo */
  const fila = (x0: number, x1: number, y: number, maximo: number, desde = 0) => {
    const paso = (x1 - x0) / Math.max(n - desde, 1)
    for (let i = desde; i < n; i++) out.push(el(PRODUCTOS[i], x0 + paso * (i - desde + 0.5), y, Math.min(maximo, paso * 0.95)))
  }
  switch (d.plantilla) {
    case 'fila': {
      const arriba = d.posTitulo !== 'abajo'
      textos(0.5, arriba ? 0.22 : 0.78, 0.062, 0.8)
      fila(0.05, 0.95, arriba ? 0.66 : 0.34, 0.3)
      break
    }
    case 'protagonista': {
      const izq = d.posTitulo === 'izquierda'
      const x = izq ? 0.72 : 0.28
      // con acompañantes, el protagonista se achica y sube, y ellos van en fila debajo
      if (n === 1) out.push(el('producto1', x, 0.5, 0.46))
      else {
        out.push(el('producto1', x, 0.38, 0.36))
        fila(x - 0.2, x + 0.2, 0.8, 0.17, 1)
      }
      textos(izq ? 0.3 : 0.7, 0.5, 0.058, 0.44)
      break
    }
    case 'cuadricula': {
      const der = d.posTitulo === 'derecha'
      const [xa, xb] = der ? [0.04, 0.52] : [0.48, 0.96]
      const cols = n <= 4 ? 2 : 3
      const filas = Math.ceil(n / cols)
      const cw = (xb - xa) / cols
      const alto = 0.88 / filas // de la altura
      const lado = Math.min(cw, (alto * OG_H) / OG_W) * 0.95
      for (let i = 0; i < n; i++) {
        const c = i % cols
        const f = Math.floor(i / cols)
        // la última fila incompleta, centrada
        const enFila = f === filas - 1 ? n - f * cols : cols
        const x = xa + (xb - xa) / 2 + (c - (enFila - 1) / 2) * cw
        out.push(el(PRODUCTOS[i], x, 0.06 + alto * (f + 0.5), lado))
      }
      textos(der ? 0.76 : 0.25, 0.5, 0.05, 0.42)
      break
    }
    case 'portada': {
      if (n === 0) {
        const y = d.posTitulo === 'arriba' ? 0.3 : d.posTitulo === 'abajo' ? 0.7 : 0.5
        textos(0.5, y, 0.075, 0.84)
      } else {
        // con productos, el título va arriba (o abajo) y ellos en fila del otro lado
        const abajo = d.posTitulo === 'abajo'
        textos(0.5, abajo ? 0.76 : 0.25, 0.068, 0.84)
        fila(0.12, 0.88, abajo ? 0.32 : 0.7, 0.26)
      }
      break
    }
  }
  if (d.esquinaLogo !== 'ninguna') {
    const s = 0.085
    const [x, y] = esquina(d.esquinaLogo, s)
    out.push(el('logo', x, y, s))
  }
  return out
}

/** Los elementos con que se pinta: los movidos a mano, o los de la plantilla. */
export const elementosDe = (d: DisenoOg) => d.elementos ?? elementosOg(d)
