import { useEffect, useState, type FormEvent } from 'react'
import { LoaderCircle, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import type { SpecialPage } from '../lib/types'
import { Hoja } from '../components/shell/Hoja'
import { Button } from '../components/ui/button'
import { Input, Label } from '../components/ui/input'
import { Segmentado } from '../components/ui/controles'
import { confirmar } from '../components/shell/Confirmar'

/** Página especial (promoción o imagen completa): crear en `posicion`, o editar `pagina`. */
export function EspecialForm({ catalogo, pagina, posicion, abierta, onClose, onGuardado }: {
  catalogo: string; pagina?: SpecialPage; posicion: number; abierta: boolean; onClose: () => void; onGuardado: () => void
}) {
  const [tipo, setTipo] = useState<'promo' | 'image'>('promo')
  const [titulo, setTitulo] = useState('')
  const [texto, setTexto] = useState('')
  const [imagen, setImagen] = useState<File | null>(null)
  const [ocupado, setOcupado] = useState(false)
  useEffect(() => {
    if (!abierta) return
    setTipo(pagina?.kind ?? 'promo')
    setTitulo(pagina?.title ?? '')
    setTexto(pagina?.body ?? '')
    setImagen(null)
  }, [abierta, pagina])

  const tieneImagen = !!imagen || !!pagina?.image
  const valido = tipo === 'image' ? tieneImagen : !!titulo.trim()

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!valido) return
    setOcupado(true)
    try {
      const fd = new FormData()
      fd.append('kind', tipo)
      fd.append('title', titulo.trim())
      fd.append('body', texto.trim())
      if (imagen) fd.append('image', imagen)
      if (pagina) await pb.collection('pages').update(pagina.id, fd)
      else {
        fd.append('catalog', catalogo)
        fd.append('position', String(posicion))
        await pb.collection('pages').create(fd)
      }
      toast.success(pagina ? 'Página guardada' : 'Página agregada')
      onGuardado()
      onClose()
    } catch (err) {
      console.error(err)
      toast.error('No se pudo guardar la página.')
    } finally {
      setOcupado(false)
    }
  }
  async function borrar() {
    if (!pagina || !(await confirmar({ titulo: '¿Quitar esta página?', accion: 'Quitar', peligro: true }))) return
    await pb.collection('pages').delete(pagina.id)
    toast.success('Página quitada')
    onGuardado()
    onClose()
  }

  return (
    <Hoja abierta={abierta} onClose={() => !ocupado && onClose()} titulo={pagina ? 'Página especial' : 'Nueva página especial'}
      pie={
        <Button type="submit" form="form-especial" size="lg" className="w-full" disabled={ocupado || !valido}>
          {ocupado ? <LoaderCircle className="animate-spin" /> : null} Guardar
        </Button>
      }>
      <form id="form-especial" onSubmit={guardar} className="space-y-4">
        <Segmentado etiqueta="Tipo de página" valor={tipo} onCambio={setTipo} opciones={[{ valor: 'promo', texto: 'Promoción' }, { valor: 'image', texto: 'Imagen completa' }]} />
        {tipo === 'promo' && (
          <>
            <div className="space-y-2">
              <Label htmlFor="esp-titulo">Título</Label>
              <Input id="esp-titulo" value={titulo} maxLength={80} placeholder="2×1 en gorras" onChange={(e) => setTitulo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="esp-texto">Texto</Label>
              <textarea id="esp-texto" value={texto} maxLength={400} rows={3} placeholder="Sólo del 1 al 15 de diciembre." onChange={(e) => setTexto(e.target.value)}
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 dark:bg-input/30" />
            </div>
          </>
        )}
        <div className="space-y-2">
          <Label htmlFor="esp-imagen">{tipo === 'image' ? 'Imagen (vertical 9:16)' : 'Imagen (opcional)'}</Label>
          <input id="esp-imagen" type="file" accept="image/png,image/jpeg,image/webp,image/avif" onChange={(e) => setImagen(e.target.files?.[0] ?? null)}
            className="block w-full text-sm file:mr-3 file:h-10 file:rounded-full file:border-0 file:bg-secondary file:px-4 file:font-medium" />
          {pagina?.image && !imagen && <p className="text-xs text-muted-foreground">Ya tiene una imagen; elige otra para reemplazarla.</p>}
        </div>
        {pagina && (
          <Button type="button" variant="destructive" className="w-full" onClick={borrar}>
            <Trash2 /> Quitar página
          </Button>
        )}
      </form>
    </Hoja>
  )
}
