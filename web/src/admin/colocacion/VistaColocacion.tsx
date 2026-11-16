import { useEffect, useRef, type PointerEvent, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Crosshair, LoaderCircle } from 'lucide-react'
import type { GarmentTemplate } from '../../lib/types'
import { COLOCACION_INICIAL, ESCALA_MAXIMA, ESCALA_MINIMA, componer, type Arte, type Colocacion } from '../../lib/mockup/componer'
import { capasDe, hexARgb } from '../../lib/mockup/navegador'
import { Button } from '../../components/ui/button'

export const PREVIEW = 480

/** Vista previa en vivo (480 px) de un diseño sobre una prenda: arrastrar mueve el diseño,
 *  «Centrar» lo regresa, y una guía punteada marca el área de impresión cuando el diseño
 *  puede salirse de ella. */
export function VistaColocacion({ plantilla, arte, hex, col, onCol, esquina }: {
  plantilla?: GarmentTemplate
  arte?: Arte
  hex: string
  col: Colocacion
  onCol: (c: Colocacion) => void
  /** arriba a la izquierda (p. ej. «2 de 5») */
  esquina?: ReactNode
}) {
  const capas = useQuery({ queryKey: ['capas', plantilla?.id, PREVIEW], queryFn: () => capasDe(plantilla!, PREVIEW), enabled: !!plantilla, staleTime: Infinity })
  const lienzo = useRef<HTMLCanvasElement>(null)
  const listo = !!capas.data && !!arte

  // un cuadro por animación como máximo
  useEffect(() => {
    if (!capas.data || !arte || !lienzo.current) return
    const raf = requestAnimationFrame(() => {
      const px = componer({ ...capas.data, tinte: hexARgb(hex), arte, colocacion: col })
      lienzo.current?.getContext('2d')!.putImageData(new ImageData(px, PREVIEW, PREVIEW), 0, 0)
    })
    return () => cancelAnimationFrame(raf)
  }, [capas.data, arte, hex, col])

  // arrastrar mueve el centro del diseño, en unidades del área de impresión; si el diseño puede
  // salirse del área, el centro también (hasta medio área más allá de cada borde)
  const libre = capas.data?.recorte === 'prenda'
  const limite = (v: number) => (libre ? Math.max(-0.5, Math.min(1.5, v)) : Math.max(0, Math.min(1, v)))
  const arrastre = useRef<{ x: number; y: number; col: Colocacion } | null>(null)
  const bajar = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastre.current = { x: e.clientX, y: e.clientY, col }
  }
  const mover = (e: PointerEvent) => {
    if (!arrastre.current || !plantilla || !lienzo.current) return
    const q = plantilla.print_area
    const w = lienzo.current.getBoundingClientRect().width
    const a = { w: (q[1][0] - q[0][0]) * w, h: (q[3][1] - q[0][1]) * w }
    const ini = arrastre.current
    onCol({ ...ini.col, x: limite(ini.col.x + (e.clientX - ini.x) / a.w), y: limite(ini.col.y + (e.clientY - ini.y) / a.h) })
  }
  const soltar = () => (arrastre.current = null)

  return (
    <div className="relative overflow-hidden rounded-3xl border bg-[#ececec] shadow-sm">
      <canvas
        ref={lienzo}
        width={PREVIEW}
        height={PREVIEW}
        onPointerDown={bajar}
        onPointerMove={mover}
        onPointerUp={soltar}
        onPointerCancel={soltar}
        className="block aspect-square w-full touch-none select-none"
      />
      {libre && plantilla && (
        <svg viewBox="0 0 1 1" className="pointer-events-none absolute inset-0 size-full" aria-hidden>
          <polygon points={plantilla.print_area.map(([x, y]) => `${x},${y}`).join(' ')} fill="none" stroke="rgb(0 0 0 / 0.28)" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
      {!listo && (
        <div className="absolute inset-0 grid place-items-center text-muted-foreground">
          <LoaderCircle className="size-6 animate-spin" />
        </div>
      )}
      {esquina && <div className="absolute top-2 left-2">{esquina}</div>}
      {listo && (
        <>
          <Button variant="outline" size="icon" aria-label="Centrar el diseño" title="Centrar"
            onClick={() => onCol({ ...col, x: 0.5, y: COLOCACION_INICIAL.y, rotation: 0 })}
            className="absolute top-2 right-2 bg-background/90 shadow-sm backdrop-blur-sm">
            <Crosshair className="size-5" />
          </Button>
          <p className="pointer-events-none absolute bottom-2 left-0 w-full text-center text-xs text-black/50">Arrastra el diseño para moverlo</p>
        </>
      )}
    </div>
  )
}

/** Tamaño (15–200 % del área de impresión) y rotación. */
export function ControlesColocacion({ col, onCol }: { col: Colocacion; onCol: (c: Colocacion) => void }) {
  return (
    <>
      <Control etiqueta="Tamaño" valor={`${Math.round(col.scale * 100)} %`}>
        <input type="range" data-vaul-no-drag min={ESCALA_MINIMA} max={ESCALA_MAXIMA} step={0.01} value={col.scale}
          onChange={(e) => onCol({ ...col, scale: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
      </Control>
      <Control etiqueta="Rotación" valor={`${Math.round(col.rotation)}°`}>
        <input type="range" data-vaul-no-drag min={-45} max={45} step={1} value={col.rotation}
          onChange={(e) => onCol({ ...col, rotation: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
      </Control>
    </>
  )
}

function Control({ etiqueta, valor, children }: { etiqueta: string; valor: string; children: ReactNode }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{etiqueta}</span>
        <span className="text-muted-foreground tabular-nums">{valor}</span>
      </div>
      {children}
    </div>
  )
}
