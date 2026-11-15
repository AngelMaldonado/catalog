import { useEffect, useRef } from 'react'
import type { FuentePaginas } from './datos'
import type { MotorBase, Vista } from './motores/base'

export type ModoVuelta = 'realistic' | 'rigid' | 'slide'

// Monta el motor del libro (cargado aparte) en un contenedor que llena el espacio disponible.
// Degrada solo: realista → rígida si no hay WebGL, se pierde el contexto o las primeras vueltas
// bajan de 45 fps (decidido en el spike).
export function LibroVista({ fuente, modo, pliego, pagina, onVista, onToque, onDegradar, onFps }: {
  fuente: FuentePaginas
  modo: ModoVuelta
  pliego: boolean
  /** página a mostrar al montar (se conserva al cambiar de modo u orientación) */
  pagina: number
  onVista: (v: Vista) => void
  onToque: (pagina: number, x: number, y: number) => void
  onDegradar: (motivo: string) => void
  /** fps de cada vuelta medida (diagnóstico) */
  onFps?: (fps: number) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const cb = useRef({ onVista, onToque, onDegradar, onFps })
  cb.current = { onVista, onToque, onDegradar, onFps }

  useEffect(() => {
    let motor: MotorBase | null = null
    let vivo = true
    const contenedor = ref.current!
    const inicial = pliego ? Math.ceil(pagina / 2) : pagina
    const opciones = {
      contenedor,
      fuente,
      pliego,
      inicial,
      onVista: (v: Vista) => cb.current.onVista(v),
      onToque: (p: number, x: number, y: number) => cb.current.onToque(p, x, y),
      onFps: (fps: number) => {
        cb.current.onFps?.(fps)
        if (modo === 'realistic' && fps < 45) cb.current.onDegradar(`${Math.round(fps)} fps`)
      },
      onFallo: (motivo: string) => cb.current.onDegradar(motivo),
    }
    const cargar =
      modo === 'realistic' ? import('./motores/realista').then((m) => new m.MotorRealista(opciones)) : modo === 'rigid' ? import('./motores/rigido').then((m) => new m.MotorRigido(opciones)) : import('./motores/deslizar').then((m) => new m.MotorDeslizar(opciones))
    cargar.then((m) => (vivo ? (motor = m) : m.destruir()))
    return () => {
      vivo = false
      motor?.destruir()
    }
    // `pagina` sólo se usa al montar: no debe re-montar el motor en cada vuelta
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fuente, modo, pliego])

  return <div ref={ref} className="flex size-full items-center justify-center [-webkit-touch-callout:none]" />
}
