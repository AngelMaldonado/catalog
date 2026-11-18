import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CircleAlert, Plus } from 'lucide-react'
import { pb } from '../lib/pb'
import type { Catalog } from '../lib/types'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Estado } from '../components/shell/Estado'
import { Fila, Grupo, Vacio } from '../components/shell/Lista'
import { Button } from '../components/ui/button'
import { CatalogoForm } from './CatalogoForm'

const VUELTA = { rigid: 'Hoja rígida', realistic: 'Página realista' } as const

export function CatalogsPage() {
  const [nuevo, setNuevo] = useState(false)
  const { data, isPending, error } = useQuery({
    queryKey: ['catalogs'],
    queryFn: () => pb.collection('catalogs').getFullList<Catalog>({ sort: '-created', expand: 'theme' }),
  })
  return (
    <Pantalla encabezado={<Encabezado marca titulo="Catálogos" />}>
      {isPending && <p className="p-6 text-muted-foreground">Cargando…</p>}
      {error && <Vacio icono={CircleAlert} titulo="Sin conexión" texto="No se pudieron cargar los catálogos." />}
      {data?.length === 0 && (
        <Vacio icono={BookOpen} titulo="Sin catálogos" texto="Crea tu primer catálogo de temporada: elige un tema y agrega tus diseños.">
          <Button onClick={() => setNuevo(true)}>
            <Plus /> Nuevo catálogo
          </Button>
        </Vacio>
      )}
      {!!data?.length && (
        <>
          <Grupo>
            {data.map((c) => (
              <Fila
                key={c.id}
                to={`/admin/catalogos/${c.id}`}
                icono={BookOpen}
                titulo={c.name}
                sub={[c.expand?.theme?.name, VUELTA[c.page_turn]].filter(Boolean).join(' · ')}
                extra={
                  <span className="flex flex-col items-end gap-1">
                    <Estado tono={c.status === 'published' ? 'exito' : 'neutro'} texto={c.status === 'published' ? 'Publicado' : 'Borrador'} />
                  </span>
                }
              />
            ))}
          </Grupo>
          <div className="mx-3 mt-3 mb-6 sm:mx-auto sm:w-full sm:max-w-3xl">
            <Button variant="outline" className="w-full" onClick={() => setNuevo(true)}>
              <Plus /> Nuevo catálogo
            </Button>
          </div>
        </>
      )}
      <CatalogoForm abierta={nuevo} onClose={() => setNuevo(false)} />
    </Pantalla>
  )
}
