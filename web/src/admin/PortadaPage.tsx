import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { LoaderCircle, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import { useProductosCatalogo, useTokenArchivos } from '../lib/datos'
import { FUENTES, cargarFuente } from '../lib/fuentes'
import { cn } from '../lib/utils'
import { useLibro } from '../catalogo/libro'
import { INTER, pintarFondoDe, recursosContra } from '../catalogo/pintar'
import { INICIAL, PRODUCTOS, SUGERENCIAS, aplicarSugerencia, type DisenoPortada, type IdElemento, type Lado, type Recursos } from '../catalogo/lienzo'
import { Encabezado } from '../components/shell/Encabezado'
import { Button } from '../components/ui/button'
import { Input, Label } from '../components/ui/input'
import { Segmentado } from '../components/ui/controles'
import { LienzoEditable } from '../components/lienzo/LienzoEditable'
import { ControlesElementos, ElegirProductos } from '../components/lienzo/PanelLienzo'
import { EditorConCajon } from './colocacion/EditorConCajon'

const ANCHO = 540
const ALTO = 960 // la página es 9:16
const NOMBRES_CONTRA: Partial<Record<IdElemento, string>> = { titulo: 'Nombre del negocio', subtitulo: 'Mensaje' }

type Disenos = Record<Lado, DisenoPortada | null>

// Editor de portada y contraportada (hilo «Editor de portada»): qué se muestra y dónde,
// arrastrando cada elemento, y la fuente del catálogo. Se guarda en catalogs.cover_layout,
// back_layout y title_font, y lo pinta el mismo pintor del visor.
export function PortadaPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const libro = useLibro(id, 'movil')
  const items = useProductosCatalogo(id)
  const { data: token } = useTokenArchivos()
  const [lado, setLado] = useState<Lado>('portada')
  const [disenos, setDisenos] = useState<Disenos>({ portada: null, contraportada: null })
  const [seleccion, setSeleccion] = useState<IdElemento | null>(null)
  const [productos, setProductos] = useState<Record<Lado, (ImageBitmap | undefined)[]>>({ portada: [], contraportada: [] })
  const [guardando, setGuardando] = useState(false)
  const diseno = disenos[lado]
  const setDiseno = (f: (d: DisenoPortada) => DisenoPortada) => setDisenos((x) => (x[lado] ? { ...x, [lado]: f(x[lado]!) } : x))

  // fuente del catálogo: id de lib/fuentes.ts, '' = la del tema; undefined = aún sin leer
  const [fuente, setFuente] = useState<string | undefined>(undefined)
  const [familia, setFamilia] = useState<string | undefined>(undefined)
  useEffect(() => {
    if (libro.data && fuente === undefined) setFuente(libro.data.catalogo.title_font ?? '')
  }, [libro.data, fuente])
  useEffect(() => {
    let vivo = true
    cargarFuente(fuente).then((f) => vivo && setFamilia(f))
    return () => {
      vivo = false
    }
  }, [fuente])
  // sin fuente propia, el título usa la del tema
  const [familiaTema, setFamiliaTema] = useState<string | undefined>(undefined)
  useEffect(() => {
    cargarFuente(libro.data?.catalogo.expand?.theme?.fonts?.fuente).then(setFamiliaTema)
  }, [libro.data])
  // las muestras del selector se ven en su propia letra
  useEffect(() => {
    FUENTES.forEach((f) => void cargarFuente(f.id))
  }, [])

  useEffect(() => {
    if (!libro.data || disenos.portada) return
    const cat = libro.data.catalogo
    setDisenos({ portada: cat.cover_layout ?? INICIAL.portada(), contraportada: cat.back_layout ?? INICIAL.contraportada() })
  }, [libro.data, disenos.portada])

  // renders grandes de los destacados de cada lado
  const ids = `${disenos.portada?.productos.join(',')}|${disenos.contraportada?.productos.join(',')}`
  useEffect(() => {
    const l = libro.data
    if (!l || !disenos.portada || !disenos.contraportada) return
    let vivo = true
    Promise.all([
      Promise.all(disenos.portada.productos.map((pid) => l.grandeDe(pid))),
      Promise.all(disenos.contraportada.productos.map((pid) => l.grandeDe(pid))),
    ]).then(([portada, contraportada]) => vivo && setProductos({ portada, contraportada }))
    return () => {
      vivo = false
    }
  }, [libro.data, ids]) // eslint-disable-line react-hooks/exhaustive-deps

  // el contexto con la fuente elegida aquí (aún sin guardar): títulos y textos
  const base = libro.data?.contexto
  const c = useMemo(
    () => base && { ...base, fuenteTitulo: familia ?? familiaTema ?? libro.data?.catalogo.expand?.theme?.fonts?.title ?? base.fuenteTitulo, fuenteTexto: familia ?? INTER },
    [base, familia, familiaTema, libro.data],
  )
  const fondo = useCallback((ctx: CanvasRenderingContext2D, w: number, h: number) => c && pintarFondoDe(ctx, w, h, c, lado === 'portada' ? 'cover' : 'back'), [c, lado])
  const recursos = useMemo<Recursos | null>(() => {
    if (!c || !diseno) return null
    if (lado === 'contraportada') return recursosContra(c, diseno, productos.contraportada)
    return {
      logo: c.negocio.logo, productos: productos.portada, tinta: c.paleta.ink, acento: c.paleta.accent, fuenteTitulo: c.fuenteTitulo, fuenteTexto: c.fuenteTexto,
      textos: { negocio: c.negocio.nombre, titulo: c.catalogo, subtitulo: diseno.subtitulo, precio: '' },
    }
  }, [c, diseno, lado, productos])

  /** Elegir destacados: cada uno ocupa su lugar (producto1…3) y se muestra; los libres se ocultan. */
  const elegir = (lista: string[]) =>
    setDiseno((d) => ({
      ...d,
      productos: lista,
      elementos: d.elementos.map((e) => {
        const k = PRODUCTOS.indexOf(e.id)
        return k < 0 ? e : { ...e, visible: k < lista.length }
      }),
    }))

  async function guardar() {
    if (!disenos.portada || !disenos.contraportada) return
    setGuardando(true)
    try {
      await pb.collection('catalogs').update(id, { cover_layout: disenos.portada, back_layout: disenos.contraportada, title_font: fuente ?? '' })
      toast.success('Portada y contraportada guardadas')
      qc.invalidateQueries({ queryKey: ['libro', id] })
      qc.invalidateQueries({ queryKey: ['catalog', id] })
      qc.invalidateQueries({ queryKey: ['visor'] })
    } catch {
      toast.error('No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  const contra = lado === 'contraportada'
  return (
    <EditorConCajon
      encabezado={<Encabezado titulo="Portadas" atras={`/admin/catalogos/${id}`} />}
      vista={
        <div className="space-y-3">
          <Segmentado<Lado> etiqueta="Página" valor={lado} onCambio={(v) => {
            setLado(v)
            setSeleccion(null)
          }} opciones={[{ valor: 'portada', texto: 'Portada' }, { valor: 'contraportada', texto: 'Contraportada' }]} />
          {diseno && recursos ? (
            <LienzoEditable ancho={ANCHO} alto={ALTO} fondo={fondo} elementos={diseno.elementos} recursos={recursos}
              seleccion={seleccion} onSeleccion={setSeleccion}
              onMover={(eid, x, y) => setDiseno((d) => ({ ...d, elementos: d.elementos.map((e) => (e.id === eid ? { ...e, x, y } : e)) }))}
              className="mx-auto h-[min(55dvh,620px)] max-w-full sm:h-[min(calc(100dvh-19rem),720px)]" />
          ) : (
            <div className="grid h-[55dvh] place-items-center text-muted-foreground">
              <LoaderCircle className="size-6 animate-spin" />
            </div>
          )}
        </div>
      }
      guardar={
        <Button size="lg" className="w-full" disabled={!disenos.portada || guardando} onClick={guardar}>
          {guardando ? <LoaderCircle className="animate-spin" /> : 'Guardar'}
        </Button>
      }
      controles={
        diseno && (
          <div className="space-y-5">
            <div className="space-y-2">
              <p className="text-sm font-medium">Sugerencias</p>
              <div className="grid grid-cols-3 gap-2">
                {SUGERENCIAS[lado].map((sg) => (
                  <button key={sg.id} type="button" className="h-11 rounded-2xl border px-2 text-sm font-medium active:bg-muted"
                    onClick={() => {
                      setDiseno((d) => aplicarSugerencia(d, sg.id, (items.data ?? []).map((it) => it.producto.id), lado))
                      setSeleccion(null)
                    }}>
                    {sg.nombre}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Fuente del catálogo (títulos y textos)</p>
              <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" data-vaul-no-drag>
                {[{ id: '', nombre: 'Del tema', familia: familiaTema }, ...FUENTES].map((f) => (
                  <button key={f.id || 'tema'} type="button" aria-pressed={(fuente ?? '') === f.id} onClick={() => setFuente(f.id)}
                    className={cn('h-14 shrink-0 rounded-2xl border px-4 text-xl', (fuente ?? '') === f.id ? 'border-acento bg-acento-tinte text-acento-texto' : '')}
                    style={{ fontFamily: f.familia }} title={f.nombre}>
                    {f.id ? c?.catalogo.split(' ')[0] || 'Navidad' : 'Del tema'}
                  </button>
                ))}
              </div>
            </div>
            <ControlesElementos elementos={diseno.elementos} onElementos={(elementos) => setDiseno((d) => ({ ...d, elementos }))}
              seleccion={seleccion} onSeleccion={setSeleccion} nombres={contra ? NOMBRES_CONTRA : undefined} />
            <div className="space-y-2">
              <Label htmlFor="pagina-texto">{contra ? 'Mensaje' : 'Subtítulo'}</Label>
              <Input id="pagina-texto" value={diseno.subtitulo} maxLength={contra ? 90 : 60} placeholder={contra ? 'Ej. ¡Gracias por tu compra!' : 'Ej. Temporada 2026'}
                onChange={(e) => {
                  const texto = e.target.value
                  setDiseno((d) => ({ ...d, subtitulo: texto, elementos: d.elementos.map((x) => (x.id === 'subtitulo' ? { ...x, visible: !!texto.trim() || x.visible } : x)) }))
                }} />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Productos destacados (hasta 3)</p>
              <ElegirProductos items={items.data ?? []} token={token} elegidos={diseno.productos} max={3} onCambio={elegir} />
            </div>
            <Button variant="outline" className="w-full" onClick={() => {
              setDiseno(() => INICIAL[lado]())
              setSeleccion(null)
            }}>
              <RotateCcw /> Restablecer {contra ? 'contraportada' : 'portada'}
            </Button>
          </div>
        )
      }
    />
  )
}
