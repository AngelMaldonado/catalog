import { pb } from '../../lib/pb'
import type { ItemProducto } from '../../lib/datos'
import { NOMBRES, rangoTamano, type Elemento, type IdElemento } from '../../catalogo/lienzo'
import { Interruptor } from '../ui/controles'
import { cn } from '../../lib/utils'

/** Tamaño del elemento elegido y la lista de elementos con su interruptor (mostrar/ocultar). */
export function ControlesElementos({ elementos, onElementos, seleccion, onSeleccion, nombres: propios }: {
  elementos: Elemento[]
  onElementos: (e: Elemento[]) => void
  seleccion: IdElemento | null
  onSeleccion: (id: IdElemento | null) => void
  /** otros nombres (p. ej. en la contraportada el título es el nombre del negocio) */
  nombres?: Partial<Record<IdElemento, string>>
}) {
  const nombre = (id: IdElemento) => propios?.[id] ?? NOMBRES[id]
  const sel = elementos.find((e) => e.id === seleccion)
  const cambiar = (id: IdElemento, c: Partial<Elemento>) => onElementos(elementos.map((e) => (e.id === id ? { ...e, ...c } : e)))
  const [min, max] = sel ? rangoTamano(sel.id) : [0, 1]
  return (
    <div className="space-y-4">
      <div className="space-y-1 rounded-2xl bg-muted/60 p-3">
        {sel ? (
          <>
            <div className="flex justify-between text-sm">
              <span className="font-medium">Tamaño: {nombre(sel.id)}</span>
              <span className="text-muted-foreground tabular-nums">{Math.round(((sel.s - min) / (max - min)) * 100)} %</span>
            </div>
            <input type="range" data-vaul-no-drag min={min} max={max} step={(max - min) / 200} value={sel.s}
              onChange={(e) => cambiar(sel.id, { s: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Toca un elemento para moverlo o cambiar su tamaño.</p>
        )}
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium">Qué se muestra</legend>
        <div className="divide-y rounded-2xl border px-3">
          {elementos.map((e) => (
            <div key={e.id} className={cn('flex items-center gap-2', seleccion === e.id && 'text-acento-texto')}>
              <button type="button" onClick={() => onSeleccion(e.visible ? e.id : null)} disabled={!e.visible}
                aria-label={`Elegir ${nombre(e.id)}`} className={cn('size-2.5 shrink-0 rounded-full', seleccion === e.id ? 'bg-acento' : 'bg-transparent')} />
              <div className="min-w-0 flex-1">
                <Interruptor etiqueta={nombre(e.id)} activo={e.visible}
                  onCambio={(v) => {
                    cambiar(e.id, { visible: v })
                    onSeleccion(v ? e.id : null)
                  }} />
              </div>
            </div>
          ))}
        </div>
      </fieldset>
    </div>
  )
}

/** Productos del catálogo con miniatura; tocar uno lo agrega (en orden) o lo quita. */
export function ElegirProductos({ items, token, elegidos, max, onCambio }: {
  items: ItemProducto[]
  token?: string
  elegidos: string[]
  max: number
  onCambio: (ids: string[]) => void
}) {
  return (
    <ul className="grid grid-cols-4 gap-2">
      {items.map(({ producto, render }) => {
        const n = elegidos.indexOf(producto.id)
        const lleno = n < 0 && elegidos.length >= max
        return (
          <li key={producto.id}>
            <button type="button" aria-pressed={n >= 0} disabled={lleno} title={producto.name}
              onClick={() => onCambio(n >= 0 ? elegidos.filter((x) => x !== producto.id) : [...elegidos, producto.id])}
              className={cn('relative block aspect-square w-full overflow-hidden rounded-xl border bg-muted/60 disabled:opacity-40', n >= 0 && 'border-acento ring-2 ring-acento')}>
              {render && token && <img src={pb.files.getURL(render, render.img_480, { token })} alt={producto.name} className="size-full object-contain" loading="lazy" />}
              {n >= 0 && <span className="absolute top-1 left-1 flex size-5 items-center justify-center rounded-full bg-acento text-[11px] font-bold text-acento-foreground">{n + 1}</span>}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
