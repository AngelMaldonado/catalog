// Consultas compartidas del admin.
import { useQuery } from '@tanstack/react-query'
import { pb } from './pb'
import type { Category, GarmentTemplate } from './types'

/** Token de archivo para los archivos protegidos (renders, originales). Dura ~2 min. */
export const useTokenArchivos = () =>
  useQuery({ queryKey: ['file-token'], queryFn: () => pb.files.getToken(), staleTime: 90_000, refetchInterval: 90_000 })

export const usePlantillas = () =>
  useQuery({ queryKey: ['garment_templates'], queryFn: () => pb.collection('garment_templates').getFullList<GarmentTemplate>({ sort: 'sort' }), staleTime: 5 * 60_000 })

export const useCategorias = () =>
  useQuery({ queryKey: ['categories'], queryFn: () => pb.collection('categories').getFullList<Category>({ sort: 'sort,name' }) })

export const dinero = (n: number, moneda = 'MXN') => new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(n)
