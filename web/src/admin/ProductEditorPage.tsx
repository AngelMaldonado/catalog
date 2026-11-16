import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import type { Product } from '../lib/types'
import { useNegocio } from '../lib/negocio'
import { COLOCACION_INICIAL, type Colocacion } from '../lib/mockup/componer'
import { arteDe, borrarProducto, guardarProducto, idsVariantes, variantesDe } from '../lib/mockup/productos'
import { useCategorias, usePlantillas } from '../lib/datos'
import { Encabezado } from '../components/shell/Encabezado'
import { Button } from '../components/ui/button'
import { Input, Label } from '../components/ui/input'
import { cn } from '../lib/utils'
import { confirmar } from '../components/shell/Confirmar'
import { EditorConCajon } from './colocacion/EditorConCajon'
import { ControlesColocacion, VistaColocacion } from './colocacion/VistaColocacion'

export function ProductEditorPage() {
  const { id = '', pid = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: negocio } = useNegocio()
  const { data: categorias = [] } = useCategorias()
  const { data: todas = [] } = usePlantillas()
  const producto = useQuery({ queryKey: ['product', pid], queryFn: () => pb.collection('products').getOne<Product>(pid, { expand: 'template,design' }) })
  const t = producto.data?.expand?.template
  const d = producto.data?.expand?.design
  const arte = useQuery({ queryKey: ['arte', d?.id], queryFn: () => arteDe(d!), enabled: !!d, staleTime: Infinity })

  const [col, setCol] = useState<Colocacion>(COLOCACION_INICIAL)
  const [colores, setColores] = useState<string[]>([])
  const [vista, setVista] = useState('')
  // variantes ofrecidas (ids de plantilla) y la que se está viendo
  const [variantes, setVariantes] = useState<string[]>([])
  const [vistaVariante, setVistaVariante] = useState('')
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
    setVariantes(idsVariantes(p))
    setVistaVariante(idsVariantes(p)[0])
    setNombre(p.name)
    setPrecio(String(p.price))
    setCategoria(p.category)
  }, [producto.data])

  async function guardar() {
    if (!producto.data || !t || !arte.data || !negocio) return
    if (!colores.length) return toast.error('Elige al menos un color.')
    if (!variantes.length) return toast.error('Elige al menos una variante.')
    // en el orden de la prenda; sólo la principal = lista vacía (como los productos de antes)
    const orden = opciones.map((v) => v.id).filter((vid) => variantes.includes(vid))
    try {
      await guardarProducto(producto.data, { name: nombre.trim() || producto.data.name, price: Number(precio) || 0, placement: col, colors: colores, category: categoria, variants: orden.length === 1 && orden[0] === t.id ? [] : orden }, todas, arte.data, negocio.business_name, (h, n) => setProgreso(`${h} de ${n} imágenes`))
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

  // la prenda y sus variantes («Con gorro», «Sin gorro»); la vista previa muestra la elegida
  const opciones = t ? variantesDe(t, todas) : []
  const tVista = opciones.find((v) => v.id === vistaVariante) ?? t
  const listo = !!t && !!arte.data && !!todas.length
  const hex = tVista?.colors.find((c) => c.name === vista)?.hex ?? '#ffffff'
  return (
    <EditorConCajon
      encabezado={<Encabezado titulo={producto.data?.name ?? 'Producto'} atras={`/admin/catalogos/${id}`} />}
      vista={<VistaColocacion plantilla={tVista} arte={arte.data} hex={hex} col={col} onCol={setCol} />}
      guardar={
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
      controles={
        <div className="space-y-4">
          <ControlesColocacion col={col} onCol={setCol} />
          {opciones.length > 1 && (
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">Variantes (toca para ver; el círculo la incluye)</legend>
              <div className="flex flex-wrap gap-2">
                {opciones.map((v) => {
                  const incluida = variantes.includes(v.id)
                  return (
                    <span key={v.id} className={cn('flex h-10 items-center gap-2.5 rounded-full border pr-4 pl-2.5', vistaVariante === v.id && 'border-acento bg-acento-tinte')}>
                      <button type="button" aria-label={incluida ? `Quitar ${v.variant_name}` : `Incluir ${v.variant_name}`} aria-pressed={incluida}
                        onClick={() => setVariantes((l) => (incluida ? l.filter((x) => x !== v.id) : [...l, v.id]))}
                        className={cn('flex size-5 shrink-0 items-center justify-center rounded-full border-2', incluida ? 'border-acento' : 'border-muted-foreground/50')}>
                        {incluida && <span className="size-2 rounded-full bg-acento" />}
                      </button>
                      <button type="button" onClick={() => setVistaVariante(v.id)} className={cn('text-sm', !incluida && 'text-muted-foreground line-through')}>
                        {v.variant_name || v.name}
                      </button>
                    </span>
                  )
                })}
              </div>
            </fieldset>
          )}
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
      }
    />
  )
}
