import { useEffect, useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { ChevronLeft, ChevronRight, LoaderCircle } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import type { Product } from '../lib/types'
import { useNegocio } from '../lib/negocio'
import { COLOCACION_INICIAL, type Colocacion } from '../lib/mockup/componer'
import { arteDe, guardarProducto, plantillasDe, totalRenders } from '../lib/mockup/productos'
import { usePlantillas } from '../lib/datos'
import { Encabezado } from '../components/shell/Encabezado'
import { Button } from '../components/ui/button'
import { EditorConCajon } from './colocacion/EditorConCajon'
import { ControlesColocacion, VistaColocacion } from './colocacion/VistaColocacion'

// Ajuste en lote: la misma colocación (tamaño, rotación y posición) para todos los productos
// elegidos en el detalle del catálogo (decidido en el hilo «Tamaño libre y ajuste en lote»).
// La vista previa recorre los productos para ver cómo queda en cada uno antes de guardar.
export function AjusteLotePage() {
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const ids = useMemo(() => (params.get('p') ?? '').split(',').filter(Boolean), [params])
  const navigate = useNavigate()
  const qc = useQueryClient()
  const { data: negocio } = useNegocio()
  const { data: todas = [] } = usePlantillas()
  const productos = useQuery({
    queryKey: ['lote', ids],
    enabled: ids.length > 0,
    queryFn: async () => {
      const filtro = pb.filter(ids.map((_, k) => `id = {:p${k}}`).join(' || '), Object.fromEntries(ids.map((x, k) => [`p${k}`, x])))
      const lista = await pb.collection('products').getFullList<Product>({ filter: filtro, expand: 'template,design' })
      return ids.map((x) => lista.find((p) => p.id === x)).filter((p): p is Product => !!p)
    },
  })
  const lista = productos.data ?? []
  const [i, setI] = useState(0)
  const actual = lista[i]
  const t = actual?.expand?.template
  const d = actual?.expand?.design
  const arte = useQuery({ queryKey: ['arte', d?.id], queryFn: () => arteDe(d!), enabled: !!d, staleTime: Infinity })

  // se parte de la colocación del primero
  const [col, setCol] = useState<Colocacion>(COLOCACION_INICIAL)
  useEffect(() => {
    if (lista[0]) setCol(lista[0].placement ?? COLOCACION_INICIAL)
  }, [lista[0]?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const [progreso, setProgreso] = useState<string | null>(null)
  async function guardar() {
    if (!lista.length || !negocio) return
    const total = lista.reduce((n, p) => n + totalRenders(plantillasDe(p, todas), p.colors), 0)
    let hechos = 0
    setProgreso(`0 de ${total} imágenes`)
    try {
      for (const p of lista) {
        const diseno = p.expand!.design!
        const a = await qc.fetchQuery({ queryKey: ['arte', diseno.id], queryFn: () => arteDe(diseno), staleTime: Infinity })
        let antes = 0
        await guardarProducto(p, { placement: col }, todas, a, negocio.business_name, (h) => {
          hechos += h - antes
          antes = h
          setProgreso(`${hechos} de ${total} imágenes`)
        })
        qc.invalidateQueries({ queryKey: ['product', p.id] })
      }
      toast.success(`${lista.length} productos ajustados`)
      qc.invalidateQueries({ queryKey: ['products', id] })
      qc.invalidateQueries({ queryKey: ['libro', id] })
      navigate(`/admin/catalogos/${id}`, { viewTransition: true })
    } catch (e) {
      console.error(e)
      toast.error('Algo falló al guardar. Los productos que alcanzaron a ajustarse ya tienen la colocación nueva.')
      qc.invalidateQueries({ queryKey: ['products', id] })
    } finally {
      setProgreso(null)
    }
  }

  const n = lista.length
  const hex = t?.colors.find((c) => c.name === actual?.colors[0])?.hex ?? '#ffffff'
  return (
    <EditorConCajon
      encabezado={<Encabezado titulo={n ? `Ajustar ${n} productos` : 'Ajustar productos'} atras={`/admin/catalogos/${id}`} />}
      vista={
        <VistaColocacion plantilla={t} arte={arte.data} hex={hex} col={col} onCol={setCol}
          esquina={n > 1 && <span className="rounded-full bg-background/90 px-2.5 py-1 text-xs font-medium tabular-nums shadow-sm">{i + 1} de {n}</span>} />
      }
      debajo={
        n > 1 && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" aria-label="Producto anterior" onClick={() => setI((i - 1 + n) % n)}>
              <ChevronLeft />
            </Button>
            <p className="min-w-0 flex-1 truncate text-center text-sm font-medium">{actual?.name}</p>
            <Button variant="outline" size="icon" aria-label="Producto siguiente" onClick={() => setI((i + 1) % n)}>
              <ChevronRight />
            </Button>
          </div>
        )
      }
      guardar={
        <Button size="lg" className="w-full" disabled={!n || !arte.data || !todas.length || progreso !== null} onClick={guardar}>
          {progreso ? (
            <>
              <LoaderCircle className="animate-spin" /> {progreso}
            </>
          ) : (
            `Guardar ${n}`
          )}
        </Button>
      }
      controles={
        <div className="space-y-4">
          <ControlesColocacion col={col} onCol={setCol} />
          <p className="rounded-2xl bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            El tamaño, la rotación y la posición se aplican iguales a los {n} productos. Recorre la vista previa para revisar cómo queda en cada uno.
          </p>
        </div>
      }
    />
  )
}
