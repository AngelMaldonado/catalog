// Arma el libro de un catálogo: datos, maquetación y las imágenes ya decodificadas (ImageBitmap)
// que necesita el pintor. Lo usa la vista previa del admin; el visor público tendrá su propia
// fuente de URLs (firmadas), con la misma forma de salida.
import { useQuery } from '@tanstack/react-query'
import { pb } from '../lib/pb'
import { FONDOS, type Catalog, type Category, type FondoPagina, type GarmentTemplate, type Product, type ProductRender, type Settings, type SpecialPage } from '../lib/types'
import { maquetar, type Modo } from './maquetar'
import { INTER, type ContextoPintado, type EspecialPintable, type PaginaPintable, type ProductoPintable } from './pintar'
import { renderPrincipal } from '../lib/mockup/productos'
import { cargarFuente } from '../lib/fuentes'

const bitmaps = new Map<string, Promise<ImageBitmap | undefined>>()
/** Decodifica una vez por archivo (la clave no incluye el token, que cambia). */
function bitmap(clave: string, url: string): Promise<ImageBitmap | undefined> {
  if (!bitmaps.has(clave)) {
    bitmaps.set(
      clave,
      fetch(url)
        .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
        .then((b) => createImageBitmap(b))
        .catch(() => undefined),
    )
  }
  return bitmaps.get(clave)!
}
const archivo = (rec: { id: string; collectionId: string }, nombre: string, token?: string) =>
  nombre ? bitmap(`${rec.id}/${nombre}`, pb.files.getURL(rec, nombre, token ? { token } : undefined)) : Promise.resolve(undefined)

export interface Libro {
  catalogo: Catalog
  paginas: PaginaPintable[]
  contexto: ContextoPintado
  /** render 960 de un producto (para destacarlo en la portada o en la imagen para redes) */
  grandeDe: (productoId: string) => Promise<ImageBitmap | undefined>
}

export async function cargarLibro(catalogId: string, modo: Modo): Promise<Libro> {
  const token = await pb.files.getToken()
  const [catalogo, negocio, categorias, productos, renders, especiales] = await Promise.all([
    pb.collection('catalogs').getOne<Catalog>(catalogId, { expand: 'theme' }),
    pb.collection('settings').getFirstListItem<Settings>(''),
    pb.collection('categories').getFullList<Category>({ sort: 'sort,name' }),
    pb.collection('products').getFullList<Product>({ filter: pb.filter('catalog = {:c}', { c: catalogId }), expand: 'template', sort: 'sort' }),
    pb.collection('product_renders').getFullList<ProductRender>({ filter: pb.filter('product.catalog = {:c}', { c: catalogId }) }),
    pb.collection('pages').getFullList<SpecialPage>({ filter: pb.filter('catalog = {:c}', { c: catalogId }), sort: 'position,created' }),
  ])
  const tema = catalogo.expand?.theme
  const grande = catalogo.layout === '1'
  // la fuente elegida para el catálogo aplica a todo su texto (sin elegir: la del tema e Inter)
  const familia = await cargarFuente(catalogo.title_font)
  // sin fuente propia, el título usa la del tema (si trae una); los textos se quedan en Inter
  const familiaTema = familia ? undefined : await cargarFuente(catalogo.expand?.theme?.fonts?.fuente)
  /** Render 960 del producto (primer color y variante): portada y imagen para redes. */
  const grandeDe = async (pid: string) => {
    const p = productos.find((x) => x.id === pid)
    const r = p && renderPrincipal(renders, p)
    return r ? archivo(r, r.img_960, token) : undefined
  }

  const fondos: Partial<Record<FondoPagina, ImageBitmap>> = {}
  await Promise.all(
    FONDOS.map(async (f) => {
      const propio = catalogo[`bg_${f}`]
      fondos[f] = propio ? await archivo(catalogo, propio) : tema ? await archivo(tema, tema[`bg_${f}`]) : undefined
    }),
  )
  const pintables: ProductoPintable[] = await Promise.all(
    productos.map(async (p) => {
      const t = p.expand?.template as GarmentTemplate | undefined
      const r = renderPrincipal(renders, p)
      return {
        id: p.id,
        category: p.category,
        sort: p.sort,
        name: p.name,
        price: p.price,
        colores: (t?.colors ?? []).filter((c) => p.colors.includes(c.name)),
        render: r ? await archivo(r, grande ? r.img_960 : r.img_480, token) : undefined,
      }
    }),
  )
  const esp: EspecialPintable[] = await Promise.all(
    especiales.map(async (e) => ({ id: e.id, position: e.position, created: e.created, kind: e.kind, title: e.title, body: e.body, imagen: await archivo(e, e.image) })),
  )
  const paginas = maquetar({ categorias, productos: pintables, orden: catalogo.category_order, porPagina: Number(catalogo.layout), especiales: esp, modo })
  return {
    catalogo,
    paginas,
    contexto: {
      catalogo: catalogo.name,
      negocio: {
        nombre: negocio.business_name,
        logo: await archivo(negocio, negocio.logo),
        whatsapp: negocio.whatsapp,
        instagram: negocio.instagram,
        facebook: negocio.facebook,
        tiktok: negocio.tiktok,
        direccion: negocio.address,
      },
      moneda: negocio.currency,
      porPagina: Number(catalogo.layout),
      paleta: tema?.palette ?? { background: '#f4efe6', ink: '#2a2118', accent: '#b0643a' },
      fuenteTitulo: familia ?? familiaTema ?? tema?.fonts?.title ?? 'Georgia, serif',
      fuenteTexto: familia ?? INTER,
      fondos,
      realce: catalogo.product_highlight || 'brillo',
      portada: catalogo.cover_layout
        ? {
            diseno: catalogo.cover_layout,
            productos: await Promise.all(catalogo.cover_layout.productos.map((pid) => grandeDe(pid))),
          }
        : undefined,
      contraportada: catalogo.back_layout
        ? { diseno: catalogo.back_layout, productos: await Promise.all(catalogo.back_layout.productos.map((pid) => grandeDe(pid))) }
        : undefined,
    },
    grandeDe,
  }
}

export const useLibro = (catalogId: string, modo: Modo) =>
  useQuery({ queryKey: ['libro', catalogId, modo], queryFn: () => cargarLibro(catalogId, modo), enabled: !!catalogId })
