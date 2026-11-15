import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { GripVertical, LoaderCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { pb } from '../lib/pb'
import type { SpecialPage } from '../lib/types'
import { useLibro } from '../catalogo/libro'
import { posicionesDesdeOrden, type Modo } from '../catalogo/maquetar'
import type { ContextoPintado, PaginaPintable } from '../catalogo/pintar'
import { PaginaLienzo } from '../catalogo/PaginaLienzo'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Button } from '../components/ui/button'
import { Segmentado } from '../components/ui/controles'
import { cn } from '../lib/utils'
import { EspecialForm } from './EspecialForm'

const etiqueta = (p: PaginaPintable) =>
  p.tipo === 'portada' ? 'Portada' : p.tipo === 'separador' ? p.seccion.nombre : p.tipo === 'productos' ? `${p.seccion.nombre} · ${p.productos.length}` : p.tipo === 'especial' ? (p.especial.kind === 'image' ? 'Imagen' : 'Promoción') : p.tipo === 'relleno' ? 'Relleno' : 'Contraportada'

// Vista previa con el mismo pintor del visor. Las páginas especiales se arrastran por su asa;
// las automáticas no se mueven (su orden sale de categorías y productos).
export function VistaPreviaPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const [modo, setModo] = useState<Modo>('movil')
  const { data: libro, isPending } = useLibro(id, modo)
  const especiales = useQuery({ queryKey: ['pages', id], queryFn: () => pb.collection('pages').getFullList<SpecialPage>({ filter: pb.filter('catalog = {:c}', { c: id }) }) })
  const [hoja, setHoja] = useState<{ pagina?: SpecialPage } | null>(null)
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const recargar = () => {
    qc.invalidateQueries({ queryKey: ['libro', id] })
    qc.invalidateQueries({ queryKey: ['pages', id] })
  }

  async function alSoltar(e: DragEndEvent) {
    if (!libro || !e.over || e.active.id === e.over.id) return
    const claves = libro.paginas.map((p) => p.clave)
    const nuevas = posicionesDesdeOrden(arrayMove(claves, claves.indexOf(String(e.active.id)), claves.indexOf(String(e.over.id))))
    const cambios = [...nuevas].filter(([pid, pos]) => especiales.data?.find((x) => x.id === pid)?.position !== pos)
    try {
      await Promise.all(cambios.map(([pid, position]) => pb.collection('pages').update(pid, { position })))
      recargar()
    } catch {
      toast.error('No se pudo mover la página.')
    }
  }

  // posición para una página nueva: antes de la contraportada
  const autos = libro?.paginas.filter((p) => p.tipo !== 'especial' && p.tipo !== 'relleno').length ?? 2
  const pliegos = libro && modo === 'pliego' ? [[null, libro.paginas[0]], ...pares(libro.paginas.slice(1, -1)), [libro.paginas.at(-1)!, null]] : null

  return (
    <Pantalla encabezado={<Encabezado titulo="Vista previa" atras={`/admin/catalogos/${id}`} />}>
      <div className="mx-auto w-full max-w-3xl space-y-4 p-3">
        <Segmentado etiqueta="Vista" valor={modo} onCambio={setModo} opciones={[{ valor: 'movil', texto: 'Celular' }, { valor: 'pliego', texto: 'Pliego (escritorio)' }]} />
        {isPending && (
          <div className="grid place-items-center p-10 text-muted-foreground">
            <LoaderCircle className="size-6 animate-spin" />
          </div>
        )}
        {libro && modo === 'movil' && (
          <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
            <SortableContext items={libro.paginas.map((p) => p.clave)} strategy={rectSortingStrategy}>
              <ol className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {libro.paginas.map((p, i) => (
                  <Miniatura key={p.clave} pagina={p} numero={i + 1} contexto={libro.contexto} onEditar={() => p.tipo === 'especial' && setHoja({ pagina: especiales.data?.find((x) => x.id === p.especial.id) })} />
                ))}
              </ol>
            </SortableContext>
          </DndContext>
        )}
        {libro && pliegos && (
          <ol className="space-y-3">
            {pliegos.map(([izq, der], i) => (
              <li key={i} className="grid grid-cols-2 overflow-hidden rounded-2xl shadow-sm">
                {[izq, der].map((p, k) => (p ? <PaginaLienzo key={k} pagina={p} contexto={libro.contexto} /> : <span key={k} />))}
              </li>
            ))}
          </ol>
        )}
        <Button variant="outline" className="w-full" onClick={() => setHoja({})}>
          <Plus /> Página especial
        </Button>
        <p className="text-center text-sm text-muted-foreground">Arrastra las páginas especiales por su asa para cambiarlas de lugar.</p>
      </div>
      <EspecialForm catalogo={id} pagina={hoja?.pagina} posicion={autos - 1} abierta={!!hoja} onClose={() => setHoja(null)} onGuardado={recargar} />
    </Pantalla>
  )
}

function pares<T>(xs: T[]): [T, T | null][] {
  const out: [T, T | null][] = []
  for (let i = 0; i < xs.length; i += 2) out.push([xs[i], xs[i + 1] ?? null])
  return out
}

function Miniatura({ pagina, numero, contexto, onEditar }: { pagina: PaginaPintable; numero: number; contexto: ContextoPintado; onEditar: () => void }) {
  const especial = pagina.tipo === 'especial'
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: pagina.clave, disabled: !especial })
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn('relative', isDragging && 'z-10 opacity-80')}>
      <button type="button" onClick={onEditar} disabled={!especial} className={cn('block w-full overflow-hidden rounded-2xl shadow-sm ring-1 ring-foreground/10', especial && 'ring-2 ring-marca')}>
        <PaginaLienzo pagina={pagina} contexto={contexto} />
      </button>
      <p className="mt-1 truncate px-1 text-xs text-muted-foreground">
        {numero}. {etiqueta(pagina)}
      </p>
      {especial && (
        <span ref={setActivatorNodeRef} {...attributes} {...listeners} role="button" aria-label="Mover página" className="absolute top-2 left-2 touch-none rounded-full bg-background/90 p-1.5 text-muted-foreground shadow-sm">
          <GripVertical className="size-4" />
        </span>
      )}
    </li>
  )
}
