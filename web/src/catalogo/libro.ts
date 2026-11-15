// Arma el libro de un catálogo: datos, maquetación y las imágenes ya decodificadas (ImageBitmap)
// que necesita el pintor. Lo usa la vista previa del admin; el visor público tendrá su propia
// fuente de URLs (firmadas), con la misma forma de salida.
import { useQuery } from '@tanstack/react-query'
import { pb } from '../lib/pb'
import { FONDOS, type Catalog, type Category, type FondoPagina, type GarmentTemplate, type Product, type ProductRender, type Settings, type SpecialPage } from '../lib/types'
import { maquetar, type Modo } from './maquetar'
import type { ContextoPintado, EspecialPintable, PaginaPintable, ProductoPintable } from './pintar'

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
      const r = renders.find((x) => x.product === p.id && x.color === p.colors[0]) ?? renders.find((x) => x.product === p.id)
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
      fuenteTitulo: tema?.fonts?.title ?? 'Georgia, serif',
      fondos,
    },
  }
}

export const useLibro = (catalogId: string, modo: Modo) =>
  useQuery({ queryKey: ['libro', catalogId, modo], queryFn: () => cargarLibro(catalogId, modo), enabled: !!catalogId })
