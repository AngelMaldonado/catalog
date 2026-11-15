import { useSyncExternalStore } from 'react'

export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = matchMedia(query)
      m.addEventListener('change', cb)
      return () => m.removeEventListener('change', cb)
    },
    () => matchMedia(query).matches,
  )
}

/** ≥ 640 px: hojas como diálogo centrado; abajo, como cajón que sube. */
export const useEscritorio = () => useMediaQuery('(min-width: 640px)')
