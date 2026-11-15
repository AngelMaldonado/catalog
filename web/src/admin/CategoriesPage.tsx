import { useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowUp, Plus, Tag, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import type { Category } from '../lib/types'
import { useCategorias } from '../lib/datos'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Hoja } from '../components/shell/Hoja'
import { Vacio } from '../components/shell/Lista'
import { Button } from '../components/ui/button'
import { Input, Label } from '../components/ui/input'
import { confirmar } from '../components/shell/Confirmar'

// Categorías del negocio: cada una es una sección de los catálogos. El orden de aquí es el
// orden por defecto; cada catálogo puede reordenar sus secciones.
export function CategoriesPage() {
  const qc = useQueryClient()
  const { data, isPending } = useCategorias()
  const [hoja, setHoja] = useState<{ categoria?: Category } | null>(null)
  const [nombre, setNombre] = useState('')
  const [ocupado, setOcupado] = useState(false)
  const recargar = () => {
    qc.invalidateQueries({ queryKey: ['categories'] })
    qc.invalidateQueries({ queryKey: ['libro'] })
  }
  const abrir = (categoria?: Category) => {
    setNombre(categoria?.name ?? '')
    setHoja({ categoria })
  }

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!nombre.trim()) return
    setOcupado(true)
    try {
      const c = hoja?.categoria
      if (c) await pb.collection('categories').update(c.id, { name: nombre.trim() })
      else await pb.collection('categories').create({ name: nombre.trim(), sort: (data?.length ?? 0) + 1 })
      toast.success(c ? 'Categoría guardada' : 'Categoría creada')
      recargar()
      setHoja(null)
    } catch {
      toast.error('No se pudo guardar. ¿Ya existe una con ese nombre?')
    } finally {
      setOcupado(false)
    }
  }

  async function borrar() {
    const c = hoja?.categoria
    if (!c || !(await confirmar({ titulo: `¿Eliminar «${c.name}»?`, texto: 'Sus productos quedarán en «Otros».', accion: 'Eliminar', peligro: true }))) return
    setOcupado(true)
    try {
      const usan = await pb.collection('products').getFullList({ filter: pb.filter('category = {:c}', { c: c.id }), fields: 'id' })
      await Promise.all(usan.map((p) => pb.collection('products').update(p.id, { category: '' })))
      await pb.collection('categories').delete(c.id)
      toast.success('Categoría eliminada')
      recargar()
      setHoja(null)
    } catch {
      toast.error('No se pudo eliminar.')
    } finally {
      setOcupado(false)
    }
  }

  async function mover(i: number, d: -1 | 1) {
    if (!data) return
    const lista = [...data]
    const j = i + d
    if (j < 0 || j >= lista.length) return
    ;[lista[i], lista[j]] = [lista[j], lista[i]]
    qc.setQueryData(['categories'], lista.map((c, k) => ({ ...c, sort: k + 1 })))
    await Promise.all(lista.map((c, k) => (c.sort !== k + 1 ? pb.collection('categories').update(c.id, { sort: k + 1 }) : null)))
    recargar()
  }

  return (
    <Pantalla encabezado={<Encabezado marca titulo="Categorías" />}>
      {isPending && <p className="p-6 text-muted-foreground">Cargando…</p>}
      {data?.length === 0 && (
        <Vacio icono={Tag} titulo="Sin categorías" texto="Crea las secciones de tus catálogos: Playeras, Para niños, Parejas…">
          <Button onClick={() => abrir()}>
            <Plus /> Nueva categoría
          </Button>
        </Vacio>
      )}
      {!!data?.length && (
        <>
          <section className="mx-3 mt-3 sm:mx-auto sm:w-full sm:max-w-3xl">
            <ul className="divide-y overflow-hidden rounded-3xl border bg-card shadow-sm">
              {data.map((c, i) => (
                <li key={c.id} className="flex items-center gap-1 pr-2">
                  <button type="button" onClick={() => abrir(c)} className="flex min-w-0 flex-1 items-center gap-3 p-4 text-left active:bg-muted">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-accent"><Tag className="size-5" /></span>
                    <span className="truncate font-semibold">{c.name}</span>
                  </button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Subir ${c.name}`} disabled={i === 0} onClick={() => mover(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label={`Bajar ${c.name}`} disabled={i === data.length - 1} onClick={() => mover(i, 1)}>
                    <ArrowDown />
                  </Button>
                </li>
              ))}
            </ul>
          </section>
          <div className="mx-3 mt-3 mb-6 sm:mx-auto sm:w-full sm:max-w-3xl">
            <Button variant="outline" className="w-full" onClick={() => abrir()}>
              <Plus /> Nueva categoría
            </Button>
          </div>
        </>
      )}
      <Hoja
        abierta={!!hoja}
        onClose={() => !ocupado && setHoja(null)}
        titulo={hoja?.categoria ? 'Categoría' : 'Nueva categoría'}
        descripcion="Cada categoría es una sección del catálogo, con su separador."
        pie={
          <Button type="submit" form="form-categoria" size="lg" className="w-full" disabled={ocupado || !nombre.trim()}>
            Guardar
          </Button>
        }
      >
        <form id="form-categoria" onSubmit={guardar} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre-categoria">Nombre</Label>
            <Input id="nombre-categoria" value={nombre} maxLength={60} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Para niños" />
          </div>
          {hoja?.categoria && (
            <Button type="button" variant="destructive" className="w-full" disabled={ocupado} onClick={borrar}>
              <Trash2 /> Eliminar categoría
            </Button>
          )}
        </form>
      </Hoja>
    </Pantalla>
  )
}
