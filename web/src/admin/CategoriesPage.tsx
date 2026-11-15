import { useState, type FormEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Tag } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import type { Category } from '../lib/types'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Hoja } from '../components/shell/Hoja'
import { Fila, Grupo, Vacio } from '../components/shell/Lista'
import { Button } from '../components/ui/button'
import { Input, Label } from '../components/ui/input'

export function CategoriesPage() {
  const qc = useQueryClient()
  const [abierta, setAbierta] = useState(false)
  const [nombre, setNombre] = useState('')
  const { data, isPending } = useQuery({
    queryKey: ['categories'],
    queryFn: () => pb.collection('categories').getFullList<Category>({ sort: 'sort,name' }),
  })
  const crear = useMutation({
    mutationFn: (name: string) => pb.collection('categories').create({ name, sort: (data?.length ?? 0) + 1 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['categories'] })
      toast.success('Categoría creada')
      setAbierta(false)
      setNombre('')
    },
    onError: () => toast.error('No se pudo crear. ¿Ya existe una con ese nombre?'),
  })
  const guardar = (e: FormEvent) => {
    e.preventDefault()
    if (nombre.trim()) crear.mutate(nombre.trim())
  }

  return (
    <Pantalla encabezado={<Encabezado marca titulo="Categorías" />}>
      {isPending && <p className="p-6 text-muted-foreground">Cargando…</p>}
      {data?.length === 0 && (
        <Vacio icono={Tag} titulo="Sin categorías" texto="Crea las secciones de tus catálogos: Playeras, Para niños, Parejas…">
          <Button onClick={() => setAbierta(true)}>
            <Plus /> Nueva categoría
          </Button>
        </Vacio>
      )}
      {!!data?.length && (
        <>
          <Grupo>
            {data.map((c) => (
              <Fila key={c.id} icono={Tag} titulo={c.name} />
            ))}
          </Grupo>
          <div className="mx-3 mt-3 mb-6 sm:mx-auto sm:w-full sm:max-w-3xl">
            <Button variant="outline" className="w-full" onClick={() => setAbierta(true)}>
              <Plus /> Nueva categoría
            </Button>
          </div>
        </>
      )}
      <Hoja
        abierta={abierta}
        onClose={() => setAbierta(false)}
        titulo="Nueva categoría"
        descripcion="Cada categoría es una sección del catálogo, con su separador."
        pie={
          <Button type="submit" form="nueva-categoria" size="lg" className="w-full" disabled={crear.isPending || !nombre.trim()}>
            Guardar
          </Button>
        }
      >
        <form id="nueva-categoria" onSubmit={guardar} className="space-y-2">
          <Label htmlFor="nombre-categoria">Nombre</Label>
          <Input id="nombre-categoria" value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Para niños" />
        </form>
      </Hoja>
    </Pantalla>
  )
}
