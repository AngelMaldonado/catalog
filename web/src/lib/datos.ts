// Consultas compartidas del admin.
import { useQuery } from '@tanstack/react-query'
import { pb } from './pb'
import type { Category, GarmentTemplate, Product, ProductRender, Theme } from './types'
import { renderPrincipal } from './mockup/productos'

/** Token de archivo para los archivos protegidos (renders, originales). Dura ~2 min. */
export const useTokenArchivos = () =>
  useQuery({ queryKey: ['file-token'], queryFn: () => pb.files.getToken(), staleTime: 90_000, refetchInterval: 90_000 })

export const usePlantillas = () =>
  useQuery({ queryKey: ['garment_templates'], queryFn: () => pb.collection('garment_templates').getFullList<GarmentTemplate>({ sort: 'sort' }), staleTime: 5 * 60_000 })

export const useCategorias = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => pb.collection('categories').getFullList<Category>({ sort: 'sort,name' }) })

export const dinero = (n: number, moneda = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(n)

export const useTemas = () =>
  useQuery({ queryKey: ['themes'], queryFn: () => pb.collection('themes').getFullList<Theme>({ sort: 'sort' }), staleTime: 5 * 60_000 })

export type ItemProducto = { producto: Product; render?: ProductRender }

/** Productos de un catálogo con su render principal (tarjetas, elegir destacados). */
export const useProductosCatalogo = (catalogId: string) =>
  useQuery({
    queryKey: ['products', catalogId],
    enabled: !!catalogId,
    queryFn: async (): Promise<ItemProducto[]> => {
      const [ps, rs] = await Promise.all([
        pb.collection('products').getFullList<Product>({ filter: pb.filter('catalog = {:c}', { c: catalogId }), sort: 'sort' }),
        pb.collection('product_renders').getFullList<ProductRender>({ filter: pb.filter('product.catalog = {:c}', { c: catalogId }) }),
      ])
      return ps.map((p) => ({ producto: p, render: renderPrincipal(rs, p) }))
    },
  })
