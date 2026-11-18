import { useQuery } from '@tanstack/react-query'
import { pb } from './pb'
import type { Settings } from './types'

/** Ajustes del negocio (registro único). Públicos: nombre, logo y contacto. */
export function useNegocio() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: () => pb.collection('settings').getFirstListItem<Settings>(''),
    staleTime: 60_000,
  })
}

export const logoUrl = (s: Settings | undefined) => (s?.logo ? pb.files.getURL(s, s.logo) : null)
