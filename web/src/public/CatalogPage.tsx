import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { BookX, LoaderCircle } from 'lucide-react'
import { pb } from '../lib/pb'
import type { Catalog } from '../lib/types'
import { useNegocio } from '../lib/negocio'
import { Vacio } from '../components/shell/Lista'
import { VisorShell } from './VisorShell'

/** El libro todavía no existe: hilo «Visor público» (porta el spike de la vuelta de página). */
function LibroPendiente({ catalogo }: { catalogo: Catalog }) {
  return (
    <div className="flex aspect-[9/16] h-full max-h-full max-w-full flex-col items-center justify-center gap-2 rounded-2xl bg-muted p-6 text-center shadow-sm ring-1 ring-foreground/5">
      <p className="font-titulo text-4xl tracking-wide">{catalogo.name}</p>
      <p className="text-sm text-muted-foreground">Aquí se hojea el catálogo ({catalogo.page_turn === 'realistic' ? 'página realista' : 'hoja rígida'}).</p>
    </div>
  )
}

export function VisorCatalogo({ catalogo }: { catalogo: Catalog }) {
  const { data: negocio } = useNegocio()
  if (!negocio) return null
  return (
    <VisorShell negocio={negocio} catalogo={catalogo} pagina={1} total={0}>
      <LibroPendiente catalogo={catalogo} />
    </VisorShell>
  )
}

export function CatalogPage() {
  const { slug = '' } = useParams()
  const { data, isPending, error } = useQuery({
    queryKey: ['catalog', slug],
    queryFn: () => pb.collection('catalogs').getFirstListItem<Catalog>(pb.filter('slug = {:slug}', { slug })),
    retry: false,
  })
  if (isPending)
    return (
      <div className="grid h-dvh place-items-center text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
      </div>
    )
  if (error || !data)
    return (
      <div className="flex h-dvh flex-col">
        <Vacio icono={BookX} titulo="Catálogo no disponible" texto="Este catálogo no existe o todavía no está publicado." />
      </div>
    )
  return <VisorCatalogo catalogo={data} />
}
