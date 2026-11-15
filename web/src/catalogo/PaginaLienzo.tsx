import { useEffect, useRef } from 'react'
import { pintarPagina, type ContextoPintado, type PaginaPintable } from './pintar'
import { cn } from '../lib/utils'

/** Una página pintada en canvas a la resolución del dispositivo (máx. DPR 2). */
export function PaginaLienzo({ pagina, contexto, className }: { pagina: PaginaPintable; contexto: ContextoPintado; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const pintar = () => {
      const dpr = Math.min(devicePixelRatio, 2)
      const w = Math.max(1, Math.round(c.clientWidth * dpr))
      const h = Math.round((w * 16) / 9)
      c.width = w
      c.height = h
      pintarPagina(c.getContext('2d')!, w, h, pagina, contexto)
    }
    document.fonts.ready.then(pintar)
    const ro = new ResizeObserver(pintar)
    ro.observe(c)
    return () => ro.disconnect()
  }, [pagina, contexto])
  return <canvas ref={ref} onContextMenu={(e) => e.preventDefault()} className={cn('block aspect-[9/16] w-full select-none', className)} />
}
