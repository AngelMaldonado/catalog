import { useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ImagePlus, LoaderCircle, TriangleAlert, X } from 'lucide-react'
import { toast } from 'sonner'
import type { Catalog } from '../lib/types'
import { useCategorias, usePlantillas } from '../lib/datos'
import { useNegocio } from '../lib/negocio'
import { leerDiseno } from '../lib/mockup/navegador'
import { coloresPara, crearProductos } from '../lib/mockup/productos'
import { Hoja } from '../components/shell/Hoja'
import { Button } from '../components/ui/button'
import { cn } from '../lib/utils'

type Elegido = { archivo: File; url: string; avisos: string[] | null }

// Arrastrar N diseños, elegir prendas y colores UNA vez, y generar diseño × prenda con un
// render por color (decidido en el interrogatorio, Q3).
export function NuevosProductos({ catalogo, abierta, onClose }: { catalogo: Catalog; abierta: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data: plantillas = [] } = usePlantillas()
  const { data: categorias = [] } = useCategorias()
  const { data: negocio } = useNegocio()
  const [elegidos, setElegidos] = useState<Elegido[]>([])
  const [prendas, setPrendas] = useState<string[]>([])
  const [colores, setColores] = useState<string[]>(['Blanco', 'Negro'])
  const [encima, setEncima] = useState(false)
  const [progreso, setProgreso] = useState<{ hechos: number; total: number; etapa: string } | null>(null)

  useEffect(() => {
    if (plantillas.length && !prendas.length) setPrendas(plantillas.map((p) => p.id))
  }, [plantillas, prendas.length])

  const todosColores = [...new Map(plantillas.flatMap((p) => p.colors).map((c) => [c.name, c])).values()]
  const usadas = plantillas.filter((p) => prendas.includes(p.id))
  const total = elegidos.length * usadas.reduce((n, t) => n + coloresPara(t, colores).length, 0)

  function agregar(lista: FileList | null) {
    const nuevos = [...(lista ?? [])].filter((f) => f.type === 'image/png' || f.type === 'image/webp')
    if (lista && nuevos.length < lista.length) toast.warning('Sólo se aceptan diseños PNG o WebP.')
    const items = nuevos.map((archivo) => ({ archivo, url: URL.createObjectURL(archivo), avisos: null }))
    setElegidos((e) => [...e, ...items])
    items.forEach((it) =>
      leerDiseno(it.archivo).then(
        (d) => setElegidos((e) => e.map((x) => (x.url === it.url ? { ...x, avisos: d.avisos } : x))),
        () => setElegidos((e) => e.map((x) => (x.url === it.url ? { ...x, avisos: ['No se pudo leer el archivo.'] } : x))),
      ),
    )
  }
  const quitar = (url: string) => setElegidos((e) => e.filter((x) => x.url !== url))
  const soltar = (ev: DragEvent) => {
    ev.preventDefault()
    setEncima(false)
    agregar(ev.dataTransfer.files)
  }
  const alternar = (lista: string[], v: string) => (lista.includes(v) ? lista.filter((x) => x !== v) : [...lista, v])

  async function generar() {
    if (!negocio) return
    try {
      const n = await crearProductos({
        catalogo, archivos: elegidos.map((e) => e.archivo), plantillas: usadas, colores, categorias,
        marca: negocio.business_name,
        onProgreso: (hechos, total, etapa) => setProgreso({ hechos, total, etapa }),
      })
      toast.success(`${n} productos creados`)
      setElegidos([])
      onClose()
    } catch (e) {
      console.error(e)
      toast.error('Algo falló al generar. Los productos que alcanzaron a crearse siguen ahí.')
    } finally {
      setProgreso(null)
      qc.invalidateQueries({ queryKey: ['products', catalogo.id] })
    }
  }

  const ocupado = progreso !== null
  return (
    <Hoja
      abierta={abierta}
      onClose={() => !ocupado && onClose()}
      titulo="Nuevos productos"
      descripcion="Suelta tus diseños; se crea un producto por cada prenda, con una imagen por color."
      pie={
        ocupado ? (
          <div className="space-y-2">
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${(progreso.hechos / Math.max(1, progreso.total)) * 100}%` }} />
            </div>
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" /> {progreso.hechos} de {progreso.total} imágenes · {progreso.etapa}
            </p>
          </div>
        ) : (
          <Button size="lg" className="w-full" disabled={!elegidos.length || !usadas.length} onClick={generar}>
            Generar {elegidos.length * usadas.length || ''} productos{total ? ` · ${total} imágenes` : ''}
          </Button>
        )
      }
    >
      <div className="space-y-5">
        <label
          onDragOver={(e) => {
            e.preventDefault()
            setEncima(true)
          }}
          onDragLeave={() => setEncima(false)}
          onDrop={soltar}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-6 text-center transition-colors',
            encima ? 'border-acento bg-acento-tinte' : 'border-border hover:bg-muted',
            ocupado && 'pointer-events-none opacity-50',
          )}
        >
          <ImagePlus className="size-8 text-muted-foreground" />
          <span className="font-semibold">Arrastra tus diseños o toca para elegir</span>
          <span className="text-sm text-muted-foreground">PNG o WebP con fondo transparente, ≥ 1000 px por lado</span>
          <input type="file" accept="image/png,image/webp" multiple className="sr-only" onChange={(e) => agregar(e.target.files)} />
        </label>

        {elegidos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {elegidos.map((e) => (
              <li key={e.url} className="relative overflow-hidden rounded-2xl border bg-[conic-gradient(#eee_25%,#fff_0_50%,#eee_0_75%,#fff_0)] bg-[length:16px_16px]">
                <img src={e.url} alt={e.archivo.name} className="aspect-square w-full object-contain p-2" />
                {e.avisos?.length ? (
                  <span title={e.avisos.join('\n')} className="absolute bottom-1 left-1 flex items-center gap-1 rounded-full bg-aviso px-1.5 py-0.5 text-[10px] font-semibold text-aviso-foreground">
                    <TriangleAlert className="size-3" /> {e.avisos.length}
                  </span>
                ) : null}
                {!ocupado && (
                  <button type="button" aria-label="Quitar" onClick={() => quitar(e.url)} className="absolute top-1 right-1 rounded-full bg-background/90 p-1">
                    <X className="size-3.5" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
        {elegidos.some((e) => e.avisos?.length) && (
          <ul className="space-y-1 rounded-2xl bg-aviso/15 p-3 text-sm">
            {elegidos.filter((e) => e.avisos?.length).map((e) => (
              <li key={e.url}><b>{e.archivo.name}:</b> {e.avisos!.join(' ')}</li>
            ))}
          </ul>
        )}

        <fieldset className="space-y-2" disabled={ocupado}>
          <legend className="text-sm font-medium">Prendas</legend>
          <div className="flex flex-wrap gap-2">
            {plantillas.map((p) => (
              <Chip key={p.id} activo={prendas.includes(p.id)} onClick={() => setPrendas((l) => alternar(l, p.id))}>
                {p.name}
              </Chip>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-2" disabled={ocupado}>
          <legend className="text-sm font-medium">Colores</legend>
          <div className="flex flex-wrap gap-2">
            {todosColores.map((c) => (
              <Chip key={c.name} activo={colores.includes(c.name)} onClick={() => setColores((l) => alternar(l, c.name))}>
                <span className="size-5 rounded-full ring-1 ring-black/15" style={{ background: c.hex }} />
                {c.name}
              </Chip>
            ))}
          </div>
        </fieldset>
      </div>
    </Hoja>
  )
}

// Chip de selección múltiple con un radio: lleno si está en la selección, hueco si no.
function Chip({ activo, onClick, children }: { activo: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-pressed={activo} onClick={onClick}
      className={cn('flex h-10 items-center gap-2 rounded-full border pr-4 pl-3 text-sm font-medium transition-colors', activo ? 'border-acento bg-acento-tinte text-acento-texto' : 'text-muted-foreground')}>
      <span aria-hidden className={cn('flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors', activo ? 'border-acento' : 'border-muted-foreground/50')}>
        {activo && <span className="size-2 rounded-full bg-acento" />}
      </span>
      {children}
    </button>
  )
}
