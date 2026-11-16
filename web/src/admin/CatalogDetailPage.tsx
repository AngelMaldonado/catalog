import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'
import { ArrowDown, ArrowUp, ChartColumn, Eye, GripVertical, ImagePlus, Settings2, Share2, Shirt } from 'lucide-react'
import { toast } from 'sonner'
import { DndContext, KeyboardSensor, PointerSensor, TouchSensor, closestCenter, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core'
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { pb } from '../lib/pb'
import type { Catalog, Product, ProductRender } from '../lib/types'
import { dinero, useCategorias, useTokenArchivos } from '../lib/datos'
import { useNegocio } from '../lib/negocio'
import { marcarDireccion } from '../lib/transicion'
import { secciones } from '../catalogo/maquetar'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Estado } from '../components/shell/Estado'
import { Vacio } from '../components/shell/Lista'
import { Button, ButtonLink } from '../components/ui/button'
import { NuevosProductos } from './NuevosProductos'
import { CatalogoForm } from './CatalogoForm'
import { Compartir } from './Compartir'

type Item = { producto: Product; render?: ProductRender }
const VUELTA = { rigid: 'Hoja rígida', realistic: 'Página realista' } as const

export function CatalogDetailPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const [hoja, setHoja] = useState<'productos' | 'ajustes' | 'compartir' | null>(null)
  const { data: negocio } = useNegocio()
  const { data: categorias = [] } = useCategorias()
  const catalogo = useQuery({ queryKey: ['catalog', id], queryFn: () => pb.collection('catalogs').getOne<Catalog>(id, { expand: 'theme' }) })
  const productos = useQuery({
    queryKey: ['products', id],
    queryFn: async (): Promise<Item[]> => {
      const [ps, rs] = await Promise.all([
        pb.collection('products').getFullList<Product>({ filter: pb.filter('catalog = {:c}', { c: id }), sort: 'sort' }),
        pb.collection('product_renders').getFullList<ProductRender>({ filter: pb.filter('product.catalog = {:c}', { c: id }) }),
      ])
      return ps.map((p) => ({ producto: p, render: rs.find((r) => r.product === p.id && r.color === p.colors[0]) ?? rs.find((r) => r.product === p.id) }))
    },
  })
  const grupos = useMemo(() => {
    const items = productos.data ?? []
    const porId = new Map(items.map((it) => [it.producto.id, it]))
    return secciones(categorias, items.map((it) => it.producto), catalogo.data?.category_order).map((s) => ({ ...s, items: s.productos.map((p) => porId.get(p.id)!) }))
  }, [productos.data, categorias, catalogo.data?.category_order])

  async function moverSeccion(i: number, d: -1 | 1) {
    const ids = grupos.map((g) => g.seccion.id).filter(Boolean)
    const j = i + d
    if (j < 0 || j >= ids.length) return
    ;[ids[i], ids[j]] = [ids[j], ids[i]]
    qc.setQueryData(['catalog', id], (c: Catalog | undefined) => (c ? { ...c, category_order: ids } : c))
    await pb.collection('catalogs').update(id, { category_order: ids })
    qc.invalidateQueries({ queryKey: ['libro', id] })
  }

  async function reordenar(seccionId: string, activo: string, sobre: string) {
    const enSeccion = grupos.find((g) => g.seccion.id === seccionId)!.items.map((it) => it.producto.id)
    const movida = arrayMove(enSeccion, enSeccion.indexOf(activo), enSeccion.indexOf(sobre))
    // el orden global sigue el de las secciones; sólo cambia el de esta sección
    const orden = grupos.flatMap((g) => (g.seccion.id === seccionId ? movida : g.items.map((it) => it.producto.id)))
    const cambios = orden.map((pid, k) => ({ pid, sort: k + 1 })).filter(({ pid, sort }) => productos.data!.find((it) => it.producto.id === pid)!.producto.sort !== sort)
    qc.setQueryData(['products', id], (lista: Item[] | undefined) => lista?.map((it) => ({ ...it, producto: { ...it.producto, sort: orden.indexOf(it.producto.id) + 1 } })).sort((a, b) => a.producto.sort - b.producto.sort))
    try {
      await Promise.all(cambios.map(({ pid, sort }) => pb.collection('products').update(pid, { sort })))
      qc.invalidateQueries({ queryKey: ['libro', id] })
    } catch {
      toast.error('No se pudo guardar el orden.')
      qc.invalidateQueries({ queryKey: ['products', id] })
    }
  }

  const c = catalogo.data
  const vigente = !!c && negocio?.current_catalog === c.id
  return (
    <Pantalla encabezado={<Encabezado titulo={c?.name ?? 'Catálogo'} atras="/admin" />}>
      {c && (
        <section className="mx-3 mt-3 rounded-3xl border bg-card p-4 shadow-sm sm:mx-auto sm:w-full sm:max-w-3xl">
          <div className="flex flex-wrap items-center gap-2">
            <Estado tono={c.status === 'published' ? 'exito' : 'neutro'} texto={c.status === 'published' ? 'Publicado' : 'Borrador'} />
            {vigente && <Estado tono="info" texto="Vigente" />}
            <span className="text-sm text-muted-foreground">
              {c.expand?.theme?.name} · {VUELTA[c.page_turn]} · {c.layout} por página
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <ButtonLink to={`/admin/catalogos/${id}/vista`} variant="secondary" className="h-16 flex-col gap-1 rounded-2xl text-xs">
              <Eye className="size-5" /> Vista previa
            </ButtonLink>
            <Button variant="secondary" className="h-16 flex-col gap-1 rounded-2xl text-xs" onClick={() => setHoja('compartir')}>
              <Share2 className="size-5" /> Compartir
            </Button>
            <ButtonLink to={`/admin/catalogos/${id}/numeros`} variant="secondary" className="h-16 flex-col gap-1 rounded-2xl text-xs">
              <ChartColumn className="size-5" /> Números
            </ButtonLink>
            <Button variant="secondary" className="h-16 flex-col gap-1 rounded-2xl text-xs" onClick={() => setHoja('ajustes')}>
              <Settings2 className="size-5" /> Ajustes
            </Button>
          </div>
        </section>
      )}

      {productos.isPending && <p className="p-6 text-muted-foreground">Cargando…</p>}
      {productos.data?.length === 0 && (
        <Vacio icono={Shirt} titulo="Sin productos" texto="Suelta tus diseños y se generan los mockups de cada prenda en los colores que elijas.">
          <Button onClick={() => setHoja('productos')}>
            <ImagePlus /> Agregar diseños
          </Button>
        </Vacio>
      )}
      {!!productos.data?.length && (
        <div className="mx-3 mt-4 mb-6 space-y-5 sm:mx-auto sm:w-full sm:max-w-3xl">
          {grupos.map((g, i) => (
            <Seccion
              key={g.seccion.id || 'otros'}
              titulo={g.seccion.nombre}
              items={g.items}
              catalogo={id}
              moneda={negocio?.currency}
              puedeSubir={!!g.seccion.id && i > 0}
              puedeBajar={!!g.seccion.id && i < grupos.filter((x) => x.seccion.id).length - 1}
              onMover={(d) => moverSeccion(i, d)}
              onReordenar={(a, b) => reordenar(g.seccion.id, a, b)}
            />
          ))}
          <Button variant="outline" className="w-full" onClick={() => setHoja('productos')}>
            <ImagePlus /> Agregar diseños
          </Button>
        </div>
      )}
      {c && <NuevosProductos catalogo={c} abierta={hoja === 'productos'} onClose={() => setHoja(null)} />}
      {c && <CatalogoForm catalogo={c} abierta={hoja === 'ajustes'} onClose={() => setHoja(null)} />}
      {c && <Compartir catalogo={c} abierta={hoja === 'compartir'} onClose={() => setHoja(null)} />}
    </Pantalla>
  )
}

function Seccion({ titulo, items, catalogo, moneda, puedeSubir, puedeBajar, onMover, onReordenar }: {
  titulo: string; items: Item[]; catalogo: string; moneda?: string; puedeSubir: boolean; puedeBajar: boolean
  onMover: (d: -1 | 1) => void; onReordenar: (activo: string, sobre: string) => void
}) {
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )
  const alSoltar = (e: DragEndEvent) => {
    if (e.over && e.active.id !== e.over.id) onReordenar(String(e.active.id), String(e.over.id))
  }
  return (
    <section>
      <div className="mb-2 flex items-center gap-1 px-1">
        <h2 className="mr-auto font-titulo text-2xl tracking-wide">{titulo}</h2>
        {(puedeSubir || puedeBajar) && (
          <>
            <Button variant="ghost" size="icon-sm" aria-label={`Subir sección ${titulo}`} disabled={!puedeSubir} onClick={() => onMover(-1)}>
              <ArrowUp />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Bajar sección ${titulo}`} disabled={!puedeBajar} onClick={() => onMover(1)}>
              <ArrowDown />
            </Button>
          </>
        )}
      </div>
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={alSoltar}>
        <SortableContext items={items.map((it) => it.producto.id)} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {items.map((it) => (
              <Tarjeta key={it.producto.id} item={it} catalogo={catalogo} moneda={moneda} />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    </section>
  )
}

function Tarjeta({ item: { producto, render }, catalogo, moneda }: { item: Item; catalogo: string; moneda?: string }) {
  const { pathname } = useLocation()
  const { data: token } = useTokenArchivos()
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: producto.id })
  const to = `/admin/catalogos/${catalogo}/productos/${producto.id}`
  return (
    <li ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={isDragging ? 'relative z-10 opacity-80' : 'relative'}>
      <Link to={to} viewTransition onClick={() => marcarDireccion(pathname, to)} className="block overflow-hidden rounded-3xl border bg-card shadow-sm active:bg-muted">
        <div className="aspect-square bg-muted/60">
          {render && token && <img src={pb.files.getURL(render, render.img_480, { token })} alt="" className="size-full object-contain" loading="lazy" draggable={false} />}
        </div>
        <div className="p-3">
          <p className="truncate text-sm font-semibold">{producto.name}</p>
          <p className="text-xs text-muted-foreground">
            {dinero(producto.price, moneda)} · {producto.colors.length} {producto.colors.length === 1 ? 'color' : 'colores'}
          </p>
        </div>
      </Link>
      <button ref={setActivatorNodeRef} {...attributes} {...listeners} type="button" aria-label={`Mover ${producto.name}`}
        className="absolute top-2 left-2 touch-none rounded-full bg-background/90 p-1.5 text-muted-foreground shadow-sm">
        <GripVertical className="size-4" />
      </button>
    </li>
  )
}
