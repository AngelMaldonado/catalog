import { useEffect, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router'
import { Copy, ImageUp, LoaderCircle, Trash2, Undo2 } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import { slugify } from '../lib/slug'
import { cn } from '../lib/utils'
import { useTemas } from '../lib/datos'
import { useNegocio } from '../lib/negocio'
import { FONDOS, type Catalog, type FondoPagina, type PageTurn } from '../lib/types'
import { cargarLibro } from '../catalogo/libro'
import { imagenOg } from '../catalogo/og'
import { duplicarCatalogo } from '../catalogo/duplicar'
import { Hoja } from '../components/shell/Hoja'
import { Button } from '../components/ui/button'
import { Input, Label } from '../components/ui/input'
import { Interruptor, Segmentado } from '../components/ui/controles'
import { confirmar } from '../components/shell/Confirmar'

const NOMBRE_FONDO: Record<FondoPagina, string> = { cover: 'Portada', divider: 'Separador', products: 'Productos', promo: 'Promoción', back: 'Contraportada', filler: 'Relleno (pliego)' }

/** Crear (sin `catalogo`) o editar un catálogo. Editar agrega publicar, vigente, fondos propios,
 *  duplicar y eliminar. */
export function CatalogoForm({ catalogo, abierta, onClose }: { catalogo?: Catalog; abierta: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { data: temas = [] } = useTemas()
  const { data: negocio } = useNegocio()
  const editar = !!catalogo
  const [nombre, setNombre] = useState('')
  const [slug, setSlug] = useState('')
  const [slugTocado, setSlugTocado] = useState(false)
  const [tema, setTema] = useState('')
  const [vuelta, setVuelta] = useState<PageTurn>('realistic')
  const [porPagina, setPorPagina] = useState<'1' | '2' | '4'>('4')
  const [publicado, setPublicado] = useState(false)
  const [vigente, setVigente] = useState(false)
  const [fondos, setFondos] = useState<Partial<Record<FondoPagina, File | null>>>({})
  const [ocupado, setOcupado] = useState<string | null>(null)

  useEffect(() => {
    if (!abierta) return
    setNombre(catalogo?.name ?? '')
    setSlug(catalogo?.slug ?? '')
    setSlugTocado(editar)
    setTema(catalogo?.theme ?? temas[0]?.id ?? '')
    setVuelta(catalogo?.page_turn ?? 'realistic')
    setPorPagina(catalogo?.layout ?? '4')
    setPublicado(catalogo?.status === 'published')
    setVigente(!!catalogo && negocio?.current_catalog === catalogo.id)
    setFondos({})
  }, [abierta, catalogo, editar, temas, negocio?.current_catalog])

  const cambiarNombre = (v: string) => {
    setNombre(v)
    if (!slugTocado) setSlug(slugify(v))
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim() || !slug || !tema) return
    setOcupado('Guardando…')
    try {
      const fd = new FormData()
      fd.append('name', nombre.trim())
      fd.append('slug', slug)
      fd.append('theme', tema)
      fd.append('page_turn', vuelta)
      fd.append('layout', porPagina)
      fd.append('status', publicado ? 'published' : 'draft')
      for (const [f, archivo] of Object.entries(fondos)) fd.append(`bg_${f}`, archivo ?? '')
      let guardado = editar ? await pb.collection('catalogs').update<Catalog>(catalogo.id, fd) : await pb.collection('catalogs').create<Catalog>(fd)
      if (publicado) {
        setOcupado('Generando imagen para compartir…')
        const og = await imagenOg(await cargarLibro(guardado.id, 'movil'))
        const f2 = new FormData()
        f2.append('og_image', new File([og], 'compartir.jpg', { type: 'image/jpeg' }))
        guardado = await pb.collection('catalogs').update<Catalog>(guardado.id, f2)
      }
      if (negocio) {
        const esVigente = negocio.current_catalog === guardado.id
        if (vigente !== esVigente) await pb.collection('settings').update(negocio.id, { current_catalog: vigente ? guardado.id : '' })
      }
      qc.invalidateQueries({ queryKey: ['catalogs'] })
      qc.invalidateQueries({ queryKey: ['catalog', guardado.id] })
      qc.invalidateQueries({ queryKey: ['libro', guardado.id] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success(editar ? 'Catálogo guardado' : 'Catálogo creado')
      onClose()
      if (!editar) navigate(`/admin/catalogos/${guardado.id}`, { viewTransition: true })
    } catch (err) {
      console.error(err)
      toast.error('No se pudo guardar. ¿El slug ya lo usa otro catálogo?')
    } finally {
      setOcupado(null)
    }
  }

  async function duplicar() {
    if (!catalogo) return
    setOcupado('Duplicando…')
    try {
      const copia = await duplicarCatalogo(catalogo, (t) => setOcupado(t))
      qc.invalidateQueries({ queryKey: ['catalogs'] })
      toast.success('Catálogo duplicado (en borrador)')
      onClose()
      navigate(`/admin/catalogos/${copia.id}`, { viewTransition: true })
    } catch (err) {
      console.error(err)
      toast.error('No se pudo duplicar.')
    } finally {
      setOcupado(null)
    }
  }

  async function eliminar() {
    if (!catalogo || !(await confirmar({ titulo: `¿Eliminar «${catalogo.name}»?`, texto: 'Se borran también todos sus productos e imágenes. No se puede deshacer.', accion: 'Eliminar', peligro: true }))) return
    setOcupado('Eliminando…')
    try {
      if (negocio?.current_catalog === catalogo.id) await pb.collection('settings').update(negocio.id, { current_catalog: '' })
      await pb.collection('catalogs').delete(catalogo.id)
      qc.invalidateQueries({ queryKey: ['catalogs'] })
      qc.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Catálogo eliminado')
      onClose()
      navigate('/admin', { replace: true, viewTransition: true })
    } catch (err) {
      console.error(err)
      toast.error('No se pudo eliminar.')
    } finally {
      setOcupado(null)
    }
  }

  const temaElegido = temas.find((t) => t.id === tema)
  return (
    <Hoja
      abierta={abierta}
      onClose={() => !ocupado && onClose()}
      titulo={editar ? 'Ajustes del catálogo' : 'Nuevo catálogo'}
      pie={
        <Button type="submit" form="form-catalogo" size="lg" className="w-full" disabled={!!ocupado || !nombre.trim() || !slug || !tema}>
          {ocupado ? (
            <>
              <LoaderCircle className="animate-spin" /> {ocupado}
            </>
          ) : editar ? 'Guardar' : 'Crear catálogo'}
        </Button>
      }
    >
      <form id="form-catalogo" onSubmit={guardar} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="cat-nombre">Nombre</Label>
          <Input id="cat-nombre" value={nombre} maxLength={80} placeholder="Navidad 2026" onChange={(e) => cambiarNombre(e.target.value)} />
          <p className="text-sm text-muted-foreground">
            Dirección: <span className="font-mono">/c/</span>
            <input aria-label="Slug" value={slug} onChange={(e) => { setSlugTocado(true); setSlug(slugify(e.target.value)) }} className="w-48 border-b border-dashed bg-transparent font-mono text-foreground outline-none" />
          </p>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Tema</legend>
          <div className="grid grid-cols-3 gap-2">
            {temas.map((t) => (
              <button key={t.id} type="button" aria-pressed={tema === t.id} onClick={() => setTema(t.id)}
                className={cn('overflow-hidden rounded-2xl border-2 text-left', tema === t.id ? 'border-acento' : 'border-transparent')}>
                {t.bg_cover && <img src={pb.files.getURL(t, t.bg_cover)} alt="" className="aspect-[9/16] w-full object-cover" loading="lazy" />}
                <span className="block truncate px-2 py-1 text-xs font-medium">{t.name}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <div className="space-y-2">
          <Label>Vuelta de página</Label>
          <Segmentado etiqueta="Vuelta de página" valor={vuelta} onCambio={setVuelta} opciones={[{ valor: 'realistic', texto: 'Página realista' }, { valor: 'rigid', texto: 'Hoja rígida' }]} />
        </div>
        <div className="space-y-2">
          <Label>Productos por página</Label>
          <Segmentado etiqueta="Productos por página" valor={porPagina} onCambio={setPorPagina} opciones={[{ valor: '1', texto: '1' }, { valor: '2', texto: '2' }, { valor: '4', texto: '4' }]} />
        </div>

        {editar && (
          <>
            <div className="divide-y rounded-2xl border px-4">
              <Interruptor etiqueta="Publicado" ayuda="Visible para tus clientes en su dirección." activo={publicado} onCambio={setPublicado} />
              <Interruptor etiqueta="Catálogo vigente" ayuda="El que se ve en la raíz de tu sitio." activo={vigente} onCambio={setVigente} />
            </div>

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Fondos (opcional: reemplaza los del tema)</legend>
              <ul className="divide-y rounded-2xl border">
                {FONDOS.map((f) => {
                  const nuevo = fondos[f]
                  const propio = catalogo[`bg_${f}`] && nuevo !== null
                  const src = nuevo ? URL.createObjectURL(nuevo) : propio ? pb.files.getURL(catalogo, catalogo[`bg_${f}`]) : temaElegido?.[`bg_${f}`] ? pb.files.getURL(temaElegido, temaElegido[`bg_${f}`]) : ''
                  return (
                    <li key={f} className="flex items-center gap-3 p-2">
                      {src ? <img src={src} alt="" className="h-14 w-8 rounded-md object-cover" /> : <span className="h-14 w-8 rounded-md bg-muted" />}
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{NOMBRE_FONDO[f]}</span>
                        <span className="block text-xs text-muted-foreground">{nuevo ? 'Nuevo (sin guardar)' : propio ? 'Propio' : 'Del tema'}</span>
                      </span>
                      {(propio || nuevo) && (
                        <Button type="button" variant="ghost" size="icon-sm" aria-label="Usar el del tema" onClick={() => setFondos((x) => ({ ...x, [f]: null }))}>
                          <Undo2 />
                        </Button>
                      )}
                      <label className="cursor-pointer rounded-full p-2 hover:bg-muted" aria-label={`Cambiar fondo de ${NOMBRE_FONDO[f]}`}>
                        <ImageUp className="size-4" />
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/avif" className="sr-only" onChange={(e) => e.target.files?.[0] && setFondos((x) => ({ ...x, [f]: e.target.files![0] }))} />
                      </label>
                    </li>
                  )
                })}
              </ul>
            </fieldset>

            <div className="grid grid-cols-2 gap-2">
              <Button type="button" variant="outline" disabled={!!ocupado} onClick={duplicar}>
                <Copy /> Duplicar
              </Button>
              <Button type="button" variant="destructive" disabled={!!ocupado} onClick={eliminar}>
                <Trash2 /> Eliminar
              </Button>
            </div>
          </>
        )}
      </form>
    </Hoja>
  )
}
