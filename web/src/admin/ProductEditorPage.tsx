import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { Crosshair, LoaderCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import type { Product } from '../lib/types'
import { useNegocio } from '../lib/negocio'
import { COLOCACION_INICIAL, componer, type Colocacion } from '../lib/mockup/componer'
import { capasDe, hexARgb } from '../lib/mockup/navegador'
import { arteDe, borrarProducto, guardarProducto } from '../lib/mockup/productos'
import { useCategorias } from '../lib/datos'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Button } from '../components/ui/button'
import { Input, Label } from '../components/ui/input'
import { cn } from '../lib/utils'
import { confirmar } from '../components/shell/Confirmar'

const PREVIEW = 480

export function ProductEditorPage() {
  const { id = '', pid = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: negocio } = useNegocio()
  const { data: categorias = [] } = useCategorias()
  const producto = useQuery({ queryKey: ['product', pid], queryFn: () => pb.collection('products').getOne<Product>(pid, { expand: 'template,design' }) })
  const t = producto.data?.expand?.template
  const d = producto.data?.expand?.design
  const arte = useQuery({ queryKey: ['arte', d?.id], queryFn: () => arteDe(d!), enabled: !!d, staleTime: Infinity })
  const capas = useQuery({ queryKey: ['capas', t?.id, PREVIEW], queryFn: () => capasDe(t!, PREVIEW), enabled: !!t, staleTime: Infinity })

  const [col, setCol] = useState<Colocacion>(COLOCACION_INICIAL)
  const [colores, setColores] = useState<string[]>([])
  const [vista, setVista] = useState('')
  const [nombre, setNombre] = useState('')
  const [precio, setPrecio] = useState('')
  const [categoria, setCategoria] = useState('')
  const [progreso, setProgreso] = useState<string | null>(null)
  useEffect(() => {
    const p = producto.data
    if (!p) return
    setCol(p.placement ?? COLOCACION_INICIAL)
    setColores(p.colors)
    setVista(p.colors[0] ?? '')
    setNombre(p.name)
    setPrecio(String(p.price))
    setCategoria(p.category)
  }, [producto.data])

  // vista previa en vivo (480 px), un cuadro por animación como máximo
  const lienzo = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!capas.data || !arte.data || !t || !lienzo.current) return
    const hex = t.colors.find((c) => c.name === vista)?.hex ?? '#ffffff'
    const raf = requestAnimationFrame(() => {
      const px = componer({ ...capas.data, tinte: hexARgb(hex), arte: arte.data, colocacion: col })
      lienzo.current?.getContext('2d')!.putImageData(new ImageData(px, PREVIEW, PREVIEW), 0, 0)
    })
    return () => cancelAnimationFrame(raf)
  }, [capas.data, arte.data, t, vista, col])

  // arrastrar sobre la vista previa mueve el diseño dentro del área
  const arrastre = useRef<{ x: number; y: number; col: Colocacion } | null>(null)
  const areaPx = () => {
    const q = t!.print_area
    const w = lienzo.current!.getBoundingClientRect().width
    return { w: (q[1][0] - q[0][0]) * w, h: (q[3][1] - q[0][1]) * w }
  }
  const bajar = (e: PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    arrastre.current = { x: e.clientX, y: e.clientY, col }
  }
  const mover = (e: PointerEvent) => {
    if (!arrastre.current || !t) return
    const a = areaPx()
    const ini = arrastre.current
    setCol({ ...ini.col, x: clamp(ini.col.x + (e.clientX - ini.x) / a.w), y: clamp(ini.col.y + (e.clientY - ini.y) / a.h) })
  }
  const soltar = () => (arrastre.current = null)

  async function guardar() {
    if (!producto.data || !t || !arte.data || !negocio) return
    if (!colores.length) return toast.error('Elige al menos un color.')
    try {
      await guardarProducto(producto.data, { name: nombre.trim() || producto.data.name, price: Number(precio) || 0, placement: col, colors: colores, category: categoria }, t, arte.data, negocio.business_name, (h, n) => setProgreso(`${h} de ${n} imágenes`))
      toast.success('Producto guardado')
      qc.invalidateQueries({ queryKey: ['products', id] })
      qc.invalidateQueries({ queryKey: ['product', pid] })
      navigate(`/admin/catalogos/${id}`, { viewTransition: true })
    } catch (e) {
      console.error(e)
      toast.error('No se pudo guardar el producto.')
    } finally {
      setProgreso(null)
    }
  }

  async function eliminar() {
    if (!producto.data || !(await confirmar({ titulo: `¿Eliminar «${producto.data.name}»?`, texto: 'Se borran también sus imágenes.', accion: 'Eliminar', peligro: true }))) return
    try {
      await borrarProducto(producto.data)
      toast.success('Producto eliminado')
      qc.invalidateQueries({ queryKey: ['products', id] })
      qc.invalidateQueries({ queryKey: ['libro', id] })
      navigate(`/admin/catalogos/${id}`, { replace: true, viewTransition: true })
    } catch (e) {
      console.error(e)
      toast.error('No se pudo eliminar.')
    }
  }

  const listo = capas.data && arte.data
  return (
    <Pantalla
      encabezado={<Encabezado titulo={producto.data?.name ?? 'Producto'} atras={`/admin/catalogos/${id}`} />}
      abajo={
        <Button size="lg" className="w-full" disabled={!listo || progreso !== null} onClick={guardar}>
          {progreso ? (
            <>
              <LoaderCircle className="animate-spin" /> {progreso}
            </>
          ) : (
            'Guardar'
          )}
        </Button>
      }
    >
      <div className="mx-auto w-full max-w-3xl space-y-4 p-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0">
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
          {!listo && (
            <div className="absolute inset-0 grid place-items-center text-muted-foreground">
              <LoaderCircle className="size-6 animate-spin" />
            </div>
          )}
          {listo && <p className="pointer-events-none absolute bottom-2 left-0 w-full text-center text-xs text-black/50">Arrastra el diseño para moverlo</p>}
        </div>

        <div className="space-y-4">
          <Control etiqueta="Tamaño" valor={`${Math.round(col.scale * 100)} %`}>
            <input type="range" min={0.15} max={1} step={0.01} value={col.scale} onChange={(e) => setCol({ ...col, scale: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
          </Control>
          <Control etiqueta="Rotación" valor={`${Math.round(col.rotation)}°`}>
            <input type="range" min={-45} max={45} step={1} value={col.rotation} onChange={(e) => setCol({ ...col, rotation: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
          </Control>
          <Button variant="outline" size="sm" onClick={() => setCol({ ...col, x: 0.5, y: COLOCACION_INICIAL.y, rotation: 0 })}>
            <Crosshair /> Centrar
          </Button>

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Colores (toca para ver; el círculo lo incluye)</legend>
            <div className="flex flex-wrap gap-2">
              {t?.colors.map((c) => {
                const incluido = colores.includes(c.name)
                return (
                  <span key={c.name} className={cn('flex h-10 items-center gap-1 rounded-full border pr-3', vista === c.name && 'border-acento bg-acento-tinte')}>
                    <button
                      type="button"
                      aria-label={incluido ? `Quitar ${c.name}` : `Incluir ${c.name}`}
                      aria-pressed={incluido}
                      onClick={() => setColores((l) => (incluido ? l.filter((x) => x !== c.name) : [...l, c.name]))}
                      className={cn('ml-1 size-7 rounded-full ring-1 ring-black/15', incluido && 'ring-2 ring-acento ring-offset-2 ring-offset-background')}
                      style={{ background: c.hex }}
                    />
                    <button type="button" onClick={() => setVista(c.name)} className={cn('text-sm', !incluido && 'text-muted-foreground line-through')}>
                      {c.name}
                    </button>
                  </span>
                )
              })}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="nombre-producto">Nombre</Label>
            <Input id="nombre-producto" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="categoria-producto">Categoría</Label>
            <select id="categoria-producto" value={categoria} onChange={(e) => setCategoria(e.target.value)}
              className="h-11 w-full rounded-2xl border border-input bg-background px-4 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 dark:bg-input/30">
              <option value="">Sin categoría (Otros)</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="precio-producto">Precio ({negocio?.currency ?? 'MXN'})</Label>
            <Input id="precio-producto" inputMode="numeric" value={precio} onChange={(e) => setPrecio(e.target.value.replace(/[^\d.]/g, ''))} />
          </div>
          <Button variant="destructive" className="w-full" onClick={eliminar} disabled={progreso !== null}>
            <Trash2 /> Eliminar producto
          </Button>
        </div>
      </div>
    </Pantalla>
  )
}

const clamp = (v: number) => Math.max(0, Math.min(1, v))

function Control({ etiqueta, valor, children }: { etiqueta: string; valor: string; children: React.ReactNode }) {
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
