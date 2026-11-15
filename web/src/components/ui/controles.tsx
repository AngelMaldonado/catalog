import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

/** Interruptor accesible (role=switch). */
export function Interruptor({ activo, onCambio, etiqueta, ayuda, deshabilitado }: { activo: boolean; onCambio: (v: boolean) => void; etiqueta: string; ayuda?: string; deshabilitado?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={activo} disabled={deshabilitado} onClick={() => onCambio(!activo)} className="flex w-full items-center gap-3 py-2 text-left disabled:opacity-50">
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{etiqueta}</span>
        {ayuda && <span className="block text-sm text-muted-foreground">{ayuda}</span>}
      </span>
      <span className={cn('relative h-7 w-12 shrink-0 rounded-full transition-colors', activo ? 'bg-acento' : 'bg-input')}>
        <span className={cn('absolute top-0.5 size-6 rounded-full bg-background shadow transition-all', activo ? 'left-[1.375rem]' : 'left-0.5')} />
      </span>
    </button>
  )
}

/** Selector de una opción entre pocas (segmentado). */
export function Segmentado<T extends string>({ valor, opciones, onCambio, etiqueta }: { valor: T; opciones: { valor: T; texto: ReactNode }[]; onCambio: (v: T) => void; etiqueta: string }) {
  return (
    <div role="radiogroup" aria-label={etiqueta} className="grid gap-1 rounded-2xl bg-muted p-1" style={{ gridTemplateColumns: `repeat(${opciones.length}, minmax(0, 1fr))` }}>
      {opciones.map((o) => (
        <button key={o.valor} type="button" role="radio" aria-checked={valor === o.valor} onClick={() => onCambio(o.valor)}
          className={cn('h-10 rounded-xl text-sm font-medium transition-colors', valor === o.valor ? 'bg-background shadow-sm' : 'text-muted-foreground')}>
          {o.texto}
        </button>
      ))}
    </div>
  )
}
