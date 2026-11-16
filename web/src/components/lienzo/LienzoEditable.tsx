import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { pintarElementos, type Caja, type Elemento, type IdElemento, type Recursos } from '../../catalogo/lienzo'
import { cn } from '../../lib/utils'

const IMAN = 0.015 // a menos de esto del centro, el elemento se pega al eje

/** Lienzo de elementos movibles (portada, imagen para redes): pinta con el mismo pintor del
 *  visor; tocar un elemento lo selecciona, arrastrarlo lo mueve y se pega a los ejes del
 *  centro (con guía visible). El tamaño se cambia afuera, con un control. */
export function LienzoEditable({ ancho, alto, fondo, elementos, recursos, seleccion, onSeleccion, onMover, className }: {
  /** resolución interna del canvas */
  ancho: number
  alto: number
  fondo: (ctx: CanvasRenderingContext2D, w: number, h: number) => void
  elementos: Elemento[]
  recursos: Recursos
  seleccion: IdElemento | null
  onSeleccion: (id: IdElemento | null) => void
  onMover: (id: IdElemento, x: number, y: number) => void
  className?: string
}) {
  const lienzo = useRef<HTMLCanvasElement>(null)
  const [cajas, setCajas] = useState<Caja[]>([])
  const [guias, setGuias] = useState<{ v: boolean; h: boolean }>({ v: false, h: false })

  useEffect(() => {
    const ctx = lienzo.current?.getContext('2d')
    if (!ctx) return
    const raf = requestAnimationFrame(() => {
      ctx.clearRect(0, 0, ancho, alto)
      fondo(ctx, ancho, alto)
      setCajas(pintarElementos(ctx, ancho, alto, elementos, recursos))
    })
    return () => cancelAnimationFrame(raf)
  }, [ancho, alto, fondo, elementos, recursos])

  const arrastre = useRef<{ id: IdElemento; px: number; py: number; x: number; y: number } | null>(null)
  const punto = (e: PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height, w: r.width, h: r.height }
  }
  const bajar = (e: PointerEvent) => {
    const p = punto(e)
    // el de encima es el último pintado
    const tocada = [...cajas].reverse().find((c) => p.x >= c.x0 && p.x <= c.x1 && p.y >= c.y0 && p.y <= c.y1)
    if (!tocada) return onSeleccion(null)
    const el = elementos.find((x) => x.id === tocada.id)!
    e.currentTarget.setPointerCapture(e.pointerId)
    onSeleccion(tocada.id)
    arrastre.current = { id: tocada.id, px: p.x, py: p.y, x: el.x, y: el.y }
  }
  const mover = (e: PointerEvent) => {
    const a = arrastre.current
    if (!a) return
    const p = punto(e)
    let x = Math.max(0, Math.min(1, a.x + p.x - a.px))
    let y = Math.max(0, Math.min(1, a.y + p.y - a.py))
    const v = Math.abs(x - 0.5) < IMAN
    const h = Math.abs(y - 0.5) < IMAN
    if (v) x = 0.5
    if (h) y = 0.5
    setGuias({ v, h })
    onMover(a.id, x, y)
  }
  const soltar = () => {
    arrastre.current = null
    setGuias({ v: false, h: false })
  }

  const sel = cajas.find((c) => c.id === seleccion)
  return (
    <div className={cn('relative select-none', className)} style={{ aspectRatio: `${ancho} / ${alto}` }}>
      <canvas ref={lienzo} width={ancho} height={alto} className="block size-full rounded-2xl shadow-sm" />
      <div className="absolute inset-0 touch-none" onPointerDown={bajar} onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
        {guias.v && <div className="pointer-events-none absolute inset-y-0 left-1/2 w-px bg-acento" />}
        {guias.h && <div className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-acento" />}
        {sel && (
          <div className="pointer-events-none absolute rounded-md outline-2 outline-offset-2 outline-acento outline-dashed"
            style={{ left: `${sel.x0 * 100}%`, top: `${sel.y0 * 100}%`, width: `${(sel.x1 - sel.x0) * 100}%`, height: `${(sel.y1 - sel.y0) * 100}%` }} />
        )}
      </div>
    </div>
  )
}
