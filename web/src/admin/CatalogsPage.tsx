import { useQuery } from '@tanstack/react-query'
import { BookOpen, CircleAlert } from 'lucide-react'
import { pb } from '../lib/pb'
import type { Catalog } from '../lib/types'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Estado } from '../components/shell/Estado'
import { Fila, Grupo, Vacio } from '../components/shell/Lista'

const VUELTA = { rigid: 'Hoja rígida', realistic: 'Página realista' } as const

export function CatalogsPage() {
  const { data, isPending, error } = useQuery({
    queryKey: ['catalogs'],
    queryFn: () => pb.collection('catalogs').getFullList<Catalog>({ sort: '-created', expand: 'theme' }),
  })
  return (
    <Pantalla encabezado={<Encabezado marca titulo="Catálogos" />}>
      {isPending && <p className="p-6 text-muted-foreground">Cargando…</p>}
      {error && <Vacio icono={CircleAlert} titulo="Sin conexión" texto="No se pudieron cargar los catálogos." />}
      {data?.length === 0 && (
        <Vacio icono={BookOpen} titulo="Sin catálogos" texto="Aquí vivirán tus catálogos de temporada. El editor llega en el hilo «Editor de catálogo»." />
      )}
      {!!data?.length && (
        <Grupo>
          {data.map((c) => (
            <Fila
              key={c.id}
              to={`/admin/catalogos/${c.id}`}
              icono={BookOpen}
              titulo={c.name}
              sub={[c.expand?.theme?.name, VUELTA[c.page_turn]].filter(Boolean).join(' · ')}
              extra={<Estado tono={c.status === 'published' ? 'exito' : 'neutro'} texto={c.status === 'published' ? 'Publicado' : 'Borrador'} />}
            />
          ))}
        </Grupo>
      )}
    </Pantalla>
  )
}
