import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { ChevronDown, Crosshair, LoaderCircle, Pencil, Trash2 } from 'lucide-react'
import { Drawer } from 'vaul'
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
import { useEscritorio } from '../lib/useMediaQuery'
import { confirmar } from '../components/shell/Confirmar'

const PREVIEW = 480
// cajón de ajustes en el celular: cerrado del todo, a media altura (se ve el diseño arriba y
// los controles de colocación abajo) o abierto casi completo
const MEDIO = 0.55
const ABIERTO = 0.9

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
  const escritorio = useEscritorio()
  const [contenedor, setContenedor] = useState<HTMLDivElement | null>(null)
  const [cajon, setCajon] = useState(false)
  const [anclaje, setAnclaje] = useState<number | string | null>(MEDIO)
  const teclado = useTeclado()
  const abrirCajon = () => {
    setAnclaje(MEDIO)
    setCajon(true)
  }
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
  }, [capas.data, arte.data, t, vista, col, escritorio]) // escritorio: el lienzo se vuelve a montar

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
  const botonGuardar = (
    <Button size="lg" className="w-full" disabled={!listo || progreso !== null} onClick={guardar}>
      {progreso ? (
        <>
          <LoaderCircle className="animate-spin" /> {progreso}
        </>
      ) : (
        'Guardar'
      )}
    </Button>
  )

  const vistaPrevia = (
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
      {listo && (
        <>
          <Button variant="outline" size="icon" aria-label="Centrar el diseño" title="Centrar"
            onClick={() => setCol({ ...col, x: 0.5, y: COLOCACION_INICIAL.y, rotation: 0 })}
            className="absolute top-2 right-2 bg-background/90 shadow-sm backdrop-blur-sm">
            <Crosshair className="size-5" />
          </Button>
          <p className="pointer-events-none absolute bottom-2 left-0 w-full text-center text-xs text-black/50">Arrastra el diseño para moverlo</p>
        </>
      )}
    </div>
  )

  const controles = (
    <div className="space-y-4">
      <Control etiqueta="Tamaño" valor={`${Math.round(col.scale * 100)} %`}>
        <input type="range" data-vaul-no-drag min={0.15} max={1} step={0.01} value={col.scale} onChange={(e) => setCol({ ...col, scale: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
      </Control>
      <Control etiqueta="Rotación" valor={`${Math.round(col.rotation)}°`}>
        <input type="range" data-vaul-no-drag min={-45} max={45} step={1} value={col.rotation} onChange={(e) => setCol({ ...col, rotation: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
      </Control>
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Colores (toca para ver; el círculo lo incluye)</legend>
        <div className="flex flex-wrap gap-2">
          {t?.colors.map((c) => {
            const incluido = colores.includes(c.name)
            return (
              <span key={c.name} className={cn('flex h-10 items-center gap-2.5 rounded-full border pr-4 pl-2.5', vista === c.name && 'border-acento bg-acento-tinte')}>
                <button
                  type="button"
                  aria-label={incluido ? `Quitar ${c.name}` : `Incluir ${c.name}`}
                  aria-pressed={incluido}
                  onClick={() => setColores((l) => (incluido ? l.filter((x) => x !== c.name) : [...l, c.name]))}
                  className={cn('size-5 shrink-0 rounded-full ring-1 ring-black/15', incluido && 'ring-2 ring-acento ring-offset-2 ring-offset-background')}
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
  )

  const encabezado = <Encabezado titulo={producto.data?.name ?? 'Producto'} atras={`/admin/catalogos/${id}`} />

  // Escritorio: vista previa y ajustes en dos columnas, Guardar abajo.
  if (escritorio)
    return (
      <Pantalla encabezado={encabezado} abajo={botonGuardar}>
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-4 p-3">
          {vistaPrevia}
          {controles}
        </div>
      </Pantalla>
    )

  // Celular: la vista previa ocupa la pantalla; Editar y Guardar van en la barra de abajo. Los
  // ajustes viven en un cajón que se abre con «Editar» o arrastrando la barra hacia arriba, y que
  // al cerrarse desaparece del todo.
  // El encabezado queda fuera del contenedor del cajón: así el cajón nunca lo tapa (con el teclado
  // abierto el contenedor es chico). overflow-clip, no hidden: un contenedor hidden lo puede
  // desplazar el navegador al enfocar un campo.
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="vt-encabezado shrink-0">{encabezado}</div>
      <div ref={setContenedor} className="relative flex min-h-0 flex-1 flex-col overflow-clip">
        <Pantalla>
          <div className="p-3">{vistaPrevia}</div>
        </Pantalla>
        <BarraArrastrable onArriba={abrirCajon}>
          <Button variant="outline" size="lg" className="shrink-0" onClick={abrirCajon}>
            <Pencil /> Editar
          </Button>
          <div className="min-w-0 flex-1">{botonGuardar}</div>
        </BarraArrastrable>
        {contenedor && (
          // repositionInputs apagado: con anclajes, vaul suma el anclaje al alto del teclado y empuja
          // el cajón de más. El teclado encoge la ventana (interactive-widget=resizes-content en
          // index.html) y con ella el contenedor; al enfocar un campo el cajón sube al 90 %.
          <Drawer.Root open={cajon} onOpenChange={setCajon} modal={false} noBodyStyles repositionInputs={false} container={contenedor}
            snapPoints={[MEDIO, ABIERTO]} fadeFromIndex={1} activeSnapPoint={anclaje} setActiveSnapPoint={setAnclaje}>
            <Drawer.Portal>
              <Drawer.Content aria-describedby={undefined}
                onFocus={(e) => {
                  if (e.target.matches('input:not([type=range]), select, textarea')) setAnclaje(ABIERTO)
                }}
                className="absolute inset-x-0 bottom-0 z-30 flex h-full flex-col rounded-t-4xl border-t bg-background shadow-[0_-8px_24px_rgb(0_0_0/0.08)] outline-none">
                <Drawer.Title className="sr-only">Ajustes del producto</Drawer.Title>
                {/* vaul mide los anclajes con el contenido a alto completo: abierto, el último 10 % queda
                    bajo el borde. El contenido mide el 90 % para que su scroll termine en el borde visible
                    (si no, el navegador deja el campo enfocado escondido ahí). */}
                <div className="flex min-h-0 flex-col" style={{ height: `${ABIERTO * 100}%` }}>
                  <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" aria-hidden />
                  <div className="flex shrink-0 gap-2 px-3 pt-3 pb-3">
                    <Button variant="outline" size="lg" className="shrink-0" onClick={() => setCajon(false)}>
                      <ChevronDown /> Cerrar
                    </Button>
                    <div className="min-w-0 flex-1">{botonGuardar}</div>
                  </div>
                  <div className={cn('min-h-0 flex-1 px-3', anclaje === ABIERTO ? 'overflow-y-auto' : 'overflow-hidden')}
                    style={{ paddingBottom: `calc(1.5rem + ${teclado}px)` }}>
                    {controles}
                  </div>
                </div>
              </Drawer.Content>
            </Drawer.Portal>
          </Drawer.Root>
        )}
      </div>
    </div>
  )
}

/** Alto del teclado cuando se SUPERPONE a la ventana (Safari en iOS no soporta
 *  interactive-widget). En Chrome con resizes-content la ventana se encoge y esto da 0. */
function useTeclado() {
  const [alto, setAlto] = useState(0)
  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return
    const medir = () => setAlto(Math.max(0, Math.round(innerHeight - vv.height)))
    vv.addEventListener('resize', medir)
    return () => vv.removeEventListener('resize', medir)
  }, [])
  return alto
}

/** Barra inferior con manija: arrastrarla hacia arriba llama a `onArriba`. */
function BarraArrastrable({ onArriba, children }: { onArriba: () => void; children: React.ReactNode }) {
  const inicio = useRef<number | null>(null)
  return (
    <div
      className="shrink-0 touch-none border-t bg-background px-3 pb-3"
      onPointerDown={(e) => (inicio.current = e.clientY)}
      onPointerMove={(e) => {
        if (inicio.current !== null && inicio.current - e.clientY > 24) {
          inicio.current = null
          onArriba()
        }
      }}
      onPointerUp={() => (inicio.current = null)}
      onPointerCancel={() => (inicio.current = null)}
    >
      <div className="mx-auto mt-2 mb-2 h-1.5 w-12 rounded-full bg-muted" aria-hidden />
      <div className="mx-auto flex max-w-3xl gap-2">{children}</div>
    </div>
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
