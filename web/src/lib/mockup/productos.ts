// Alta de productos a partir de diseños (diseño × prenda, un render por color) y regeneración
// de los renders cuando cambia la colocación o los colores.
import { pb } from '../pb'
import type { Catalog, Category, Design, GarmentTemplate, Product, ProductRender } from '../types'
import { COLOCACION_INICIAL, type Arte, type Colocacion } from './componer'
import { capasDe, componerEnLienzo, exportarRender, leerDiseno } from './navegador'

export type Progreso = (hechos: number, total: number, etapa: string) => void

/** Nombre legible del diseño. El selector de fotos de Android entrega nombres numéricos
 *  («1000000167.png»): en ese caso, «Diseño N». */
const nombreDe = (archivo: File, n: number) => {
  const base = archivo.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim().slice(0, 80)
  return !base || /^\d+$/.test(base) ? `Diseño ${n}` : base
}
const pausa = () => new Promise((r) => setTimeout(r, 0)) // deja respirar a la interfaz

/** Colores elegidos que la plantilla ofrece (si ninguno coincide, su primer color). */
export function coloresPara(t: GarmentTemplate, elegidos: string[]) {
  const ok = t.colors.filter((c) => elegidos.includes(c.name))
  return ok.length ? ok : t.colors.slice(0, 1)
}

/** Un render por color. Si el color ya tiene render se actualiza en su lugar (índice único
 *  producto + color); si no, se crea. */
async function subirRenders(producto: Product, t: GarmentTemplate, arte: Arte, colocacion: Colocacion, colores: string[], marca: string, avance: () => void, existentes: ProductRender[] = []) {
  const capas = await capasDe(t)
  for (const color of t.colors.filter((c) => colores.includes(c.name))) {
    const lienzo = componerEnLienzo(capas, color.hex, arte, colocacion)
    const { r960, r480 } = await exportarRender(lienzo, marca)
    const ext = r960.type === 'image/png' ? 'png' : 'webp'
    const fd = new FormData()
    fd.append('product', producto.id)
    fd.append('color', color.name)
    fd.append('img_960', new File([r960], `${color.name}-960.${ext}`, { type: r960.type }))
    fd.append('img_480', new File([r480], `${color.name}-480.${ext}`, { type: r480.type }))
    const previo = existentes.find((r) => r.color === color.name)
    if (previo) await pb.collection('product_renders').update(previo.id, fd)
    else await pb.collection('product_renders').create(fd)
    avance()
    await pausa()
  }
}

export async function crearProductos(opts: {
  catalogo: Catalog
  archivos: File[]
  plantillas: GarmentTemplate[]
  colores: string[]
  categorias: Category[]
  marca: string
  onProgreso: Progreso
}): Promise<number> {
  const { catalogo, archivos, plantillas, colores, categorias, marca, onProgreso } = opts
  const total = archivos.length * plantillas.reduce((n, t) => n + coloresPara(t, colores).length, 0)
  let hechos = 0
  let creados = 0
  onProgreso(0, total, 'Preparando…')
  const existentes = await pb.collection('products').getList(1, 1, { filter: pb.filter('catalog = {:c}', { c: catalogo.id }) })
  let orden = existentes.totalItems
  const disenos = await pb.collection('designs').getList(1, 1, { filter: pb.filter('catalog = {:c}', { c: catalogo.id }) })
  let numero = disenos.totalItems
  for (const archivo of archivos) {
    const leido = await leerDiseno(archivo)
    const fd = new FormData()
    fd.append('catalog', catalogo.id)
    fd.append('name', nombreDe(archivo, ++numero))
    fd.append('file', archivo)
    fd.append('width', String(leido.w))
    fd.append('height', String(leido.h))
    const diseno = await pb.collection('designs').create<Design>(fd)
    for (const t of plantillas) {
      const cols = coloresPara(t, colores).map((c) => c.name)
      const producto = await pb.collection('products').create<Product>({
        catalog: catalogo.id,
        design: diseno.id,
        template: t.id,
        category: categorias.find((c) => c.name === t.category_name)?.id ?? '',
        name: `${diseno.name} · ${t.name}`,
        price: t.base_price,
        placement: COLOCACION_INICIAL,
        colors: cols,
        sizes: t.sizes,
        sort: ++orden,
      })
      creados++
      onProgreso(hechos, total, `${diseno.name} · ${t.name}`)
      await subirRenders(producto, t, leido.arte, COLOCACION_INICIAL, cols, marca, () => onProgreso(++hechos, total, `${diseno.name} · ${t.name}`))
    }
  }
  return creados
}

/** El original es un archivo protegido: se descarga con token de archivo. */
export async function arteDe(diseno: Design): Promise<Arte> {
  const token = await pb.files.getToken()
  const blob = await (await fetch(pb.files.getURL(diseno, diseno.file, { token }))).blob()
  return (await leerDiseno(blob)).arte
}

/** Guarda producto (colocación, colores, nombre, precio) y regenera sus renders: actualiza los
 *  de los colores que siguen, crea los de colores nuevos y borra los de colores quitados. */
export async function guardarProducto(producto: Product, cambios: Partial<Pick<Product, 'name' | 'price' | 'placement' | 'colors' | 'category'>>, t: GarmentTemplate, arte: Arte, marca: string, onProgreso: Progreso) {
  const actualizado = await pb.collection('products').update<Product>(producto.id, cambios)
  const existentes = await pb.collection('product_renders').getFullList<ProductRender>({ filter: pb.filter('product = {:p}', { p: producto.id }) })
  const total = actualizado.colors.length
  let hechos = 0
  onProgreso(0, total, 'Generando imágenes…')
  await subirRenders(actualizado, t, arte, actualizado.placement, actualizado.colors, marca, () => onProgreso(++hechos, total, 'Generando imágenes…'), existentes)
  for (const r of existentes) if (!actualizado.colors.includes(r.color)) await pb.collection('product_renders').delete(r.id)
  return actualizado
}

/** Borra el producto (sus renders se van en cascada) y su diseño si ya ningún producto lo usa. */
export async function borrarProducto(producto: Product) {
  await pb.collection('products').delete(producto.id)
  const otros = await pb.collection('products').getList(1, 1, { filter: pb.filter('design = {:d}', { d: producto.design }) })
  if (!otros.totalItems) await pb.collection('designs').delete(producto.design)
}
