import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { LoaderCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import type { Catalog } from '../lib/types'
import { useProductosCatalogo, useTokenArchivos } from '../lib/datos'
import { useLibro } from '../catalogo/libro'
import { OG_H, OG_W, imagenOg, pintarFondoOg, recursosOg } from '../catalogo/og'
import { PLANTILLAS_OG, cantidadOg, elementosDe, ogInicial, type DisenoOg, type Elemento, type EsquinaLogo, type IdElemento, type PlantillaOg, type PosicionTitulo, type Recursos } from '../catalogo/lienzo'
import { Encabezado } from '../components/shell/Encabezado'
import { Button } from '../components/ui/button'
import { Interruptor, Segmentado } from '../components/ui/controles'
import { LienzoEditable } from '../components/lienzo/LienzoEditable'
import { ControlesElementos, ElegirProductos } from '../components/lienzo/PanelLienzo'
import { Pantalla } from '../components/shell/Pantalla'
import { PreviewRedes } from './PreviewRedes'
import { cn } from '../lib/utils'

const POSICIONES: Record<PosicionTitulo, string> = { arriba: 'Arriba', centro: 'Centro', abajo: 'Abajo', izquierda: 'Izquierda', derecha: 'Derecha' }
const ESQUINAS: { valor: EsquinaLogo; texto: string }[] = [
  { valor: 'sup-izq', texto: '↖' }, { valor: 'sup-der', texto: '↗' }, { valor: 'inf-izq', texto: '↙' }, { valor: 'inf-der', texto: '↘' }, { valor: 'ninguna', texto: 'Sin' },
]

// Imagen para redes (hilo «Imagen para redes que vende»): una plantilla con opciones, o
// personalizada moviendo sus elementos. Se guarda en catalogs.og_layout y al guardar se genera
// la imagen (og_image) que el servidor pone en las etiquetas Open Graph.
export function RedesPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const libro = useLibro(id, 'movil')
  const catalogo = useQuery({ queryKey: ['catalog', id], queryFn: () => pb.collection('catalogs').getOne<Catalog>(id, { expand: 'theme' }) })
  const items = useProductosCatalogo(id)
  const { data: token } = useTokenArchivos()
  const [d, setD] = useState<DisenoOg | null>(null)
  const [seleccion, setSeleccion] = useState<IdElemento | null>(null)
  const [recursos, setRecursos] = useState<Recursos | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [tab, setTab] = useState<'editar' | 'vista'>('editar')
  // vista previa: la imagen del diseño actual (sin guardar), generada al abrir la pestaña
  const [vista, setVista] = useState<string | null>(null)
  useEffect(() => {
    if (tab !== 'vista' || !d || !libro.data) return
    let url: string | null = null
    let vivo = true
    setVista(null)
    imagenOg(libro.data, d).then((b) => {
      url = URL.createObjectURL(b)
      if (vivo) setVista(url)
    })
    return () => {
      vivo = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [tab, d, libro.data])

  useEffect(() => {
    if (libro.data && !d) setD(libro.data.catalogo.og_layout ?? ogInicial())
  }, [libro.data, d])

  // los recursos dependen de la plantilla (cuántos productos), los productos y el precio
  const clave = d ? `${d.plantilla}|${d.cantidad ?? ''}|${d.productos?.join(',') ?? 'auto'}` : ''
  useEffect(() => {
    if (!libro.data || !d) return
    let vivo = true
    recursosOg(libro.data, d).then((r) => vivo && setRecursos(r))
    return () => {
      vivo = false
    }
  }, [libro.data, clave]) // eslint-disable-line react-hooks/exhaustive-deps

  const c = libro.data?.contexto
  const fondo = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => c && pintarFondoOg(ctx, w, h, c), [c])
  const elementos = useMemo(() => (d ? elementosDe(d) : []), [d])
  const plantilla = PLANTILLAS_OG.find((p) => p.id === d?.plantilla)

  /** Cambiar una opción de la plantilla deshace lo movido a mano (se vuelve a armar). */
  const opcion = (cambios: Partial<DisenoOg>) => setD((x) => x && { ...x, ...cambios, elementos: null })
  /** Mover o cambiar un elemento la vuelve personalizada. */
  const personalizar = (lista: Elemento[]) => setD((x) => x && { ...x, elementos: lista })

  async function guardar() {
    if (!d || !libro.data) return
    setGuardando(true)
    try {
      const og = await imagenOg(libro.data, d)
      const fd = new FormData()
      fd.append('og_layout', JSON.stringify(d))
      fd.append('og_image', new File([og], 'compartir.jpg', { type: 'image/jpeg' }))
      const guardado = await pb.collection('catalogs').update<Catalog>(id, fd, { expand: 'theme' })
      qc.setQueryData(['catalog', id], guardado)
      qc.invalidateQueries({ queryKey: ['libro', id] })
      toast.success('Imagen para redes guardada')
    } catch (e) {
      console.error(e)
      toast.error('No se pudo guardar la imagen.')
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Pantalla
      encabezado={<Encabezado titulo="Imagen para redes" atras={`/admin/catalogos/${id}`} />}
      abajo={
        <Button size="lg" className="w-full" disabled={!d || !recursos || guardando} onClick={guardar}>
          {guardando ? <LoaderCircle className="animate-spin" /> : 'Guardar imagen'}
        </Button>
      }
    >
      {/* Celular: pestañas y lienzo fijos arriba, debajo se desplazan los controles. Escritorio:
          dos columnas (el lienzo a lo ancho tapaba toda el área visible): pestañas y lienzo fijos
          a la izquierda, controles a la derecha. */}
      <div className="sm:mx-auto sm:grid sm:w-full sm:max-w-5xl sm:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] sm:items-start sm:gap-2">
      <div className="sticky top-0 z-10 border-b bg-background px-3 pt-3 pb-3 sm:border-b-0">
        <Segmentado<'editar' | 'vista'> etiqueta="Pestañas" valor={tab} onCambio={setTab}
          opciones={[{ valor: 'editar', texto: 'Editar' }, { valor: 'vista', texto: 'Vista previa' }]} />
        {tab === 'editar' && (
          <div className="mt-3">
            {d && recursos ? (
              <LienzoEditable ancho={OG_W} alto={OG_H} fondo={fondo} elementos={elementos} recursos={recursos}
                seleccion={seleccion} onSeleccion={setSeleccion}
                onMover={(eid, x, y) => personalizar(elementos.map((e) => (e.id === eid ? { ...e, x, y } : e)))}
                className="w-full" />
            ) : (
              <div className="grid aspect-[1200/630] place-items-center rounded-2xl bg-muted text-muted-foreground">
                <LoaderCircle className="size-6 animate-spin" />
              </div>
            )}
          </div>
        )}
      </div>
      <div className={cn('p-3 pb-6', tab === 'vista' && 'sm:col-span-2')}>
        {tab === 'editar' ? (
          d && plantilla && (
            <div className="space-y-5">
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Plantilla</legend>
                <div className="grid grid-cols-2 gap-2">
                  {PLANTILLAS_OG.map((p) => (
                    <button key={p.id} type="button" aria-pressed={d.plantilla === p.id}
                      onClick={() => opcion({ plantilla: p.id as PlantillaOg, posTitulo: p.posiciones[0], cantidad: null })}
                      className={cn('h-14 rounded-2xl border px-3 text-left text-sm font-medium', d.plantilla === p.id ? 'border-acento bg-acento-tinte text-acento-texto' : 'text-muted-foreground')}>
                      {p.nombre}
                    </button>
                  ))}
                </div>
              </fieldset>
              {d.elementos && (
                <div className="flex items-center gap-2 rounded-2xl bg-acento-tinte px-3 py-2 text-sm text-acento-texto">
                  <span className="flex-1">Personalizada: moviste elementos a mano.</span>
                  <Button variant="ghost" size="sm" onClick={() => setD({ ...d, elementos: null })}>
                    <RotateCcw /> Plantilla
                  </Button>
                </div>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium">Título</p>
                <Segmentado<PosicionTitulo> etiqueta="Posición del título" valor={d.posTitulo} onCambio={(v) => opcion({ posTitulo: v })}
                  opciones={plantilla.posiciones.map((v) => ({ valor: v, texto: POSICIONES[v] }))} />
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium">Logo</p>
                <Segmentado<EsquinaLogo> etiqueta="Esquina del logo" valor={d.esquinaLogo} onCambio={(v) => opcion({ esquinaLogo: v })} opciones={ESQUINAS} />
              </div>
              <Interruptor etiqueta="Precio «desde»" ayuda="El precio más bajo de los productos que se muestran" activo={d.precio} onCambio={(v) => opcion({ precio: v })} />
              {plantilla.max > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Cuántos productos</p>
                <Segmentado<string> etiqueta="Cuántos productos" valor={String(cantidadOg(d))} onCambio={(v) => opcion({ cantidad: Number(v) })}
                  opciones={Array.from({ length: plantilla.max - plantilla.min + 1 }, (_, k) => String(plantilla.min + k)).map((v) => ({ valor: v, texto: v === '0' ? 'Ninguno' : v }))} />
              </div>
            )}
            {cantidadOg(d) > 0 && (
              <div className="space-y-2">
                <Interruptor etiqueta="Elegir los productos" ayuda={d.productos ? `Hasta ${cantidadOg(d)}, en el orden que los toques` : 'Apagado: los primeros del catálogo'}
                  activo={!!d.productos} onCambio={(v) => setD({ ...d, productos: v ? [] : null })} />
                {d.productos && <ElegirProductos items={items.data ?? []} token={token} elegidos={d.productos} max={cantidadOg(d)} onCambio={(ids) => setD({ ...d, productos: ids })} />}
              </div>
            )}
              <ControlesElementos elementos={elementos} onElementos={personalizar} seleccion={seleccion} onSeleccion={setSeleccion} />
              <Button variant="outline" className="w-full" onClick={() => {
                setD(ogInicial())
                setSeleccion(null)
              }}>
                <RotateCcw /> Restablecer
              </Button>
            </div>
          )
        ) : catalogo.data && (
          <div className="space-y-2">
            {!vista ? (
              <div className="grid h-40 place-items-center text-muted-foreground">
                <LoaderCircle className="size-6 animate-spin" />
              </div>
            ) : (
              <PreviewRedes catalogo={catalogo.data} imagen={vista} />
            )}
            <p className="text-xs text-muted-foreground">Así se verá con lo que tienes en «Editar». Se publica al guardar.</p>
          </div>
        )}
      </div>
      </div>
    </Pantalla>
  )
}
