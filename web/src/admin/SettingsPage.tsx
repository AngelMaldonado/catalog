import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Coins, ImagePlus, MapPin, Palette, Store, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { pb } from '../lib/pb'
import { useNegocio, logoUrl } from '../lib/negocio'
import { iniciales } from '../lib/utils'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Fila, Grupo } from '../components/shell/Lista'
import { Hoja } from '../components/shell/Hoja'
import { Button, buttonVariants } from '../components/ui/button'
import { Input, Label } from '../components/ui/input'
import { WhatsApp } from '../components/iconos/WhatsApp'

type Seccion = 'nombre' | 'whatsapp' | 'direccion'
const TITULOS: Record<Seccion, { titulo: string; descripcion: string }> = {
  nombre: { titulo: 'Nombre y logo', descripcion: 'Salen arriba del catálogo y en la página de contacto.' },
  whatsapp: { titulo: 'WhatsApp', descripcion: 'A este número llegan los pedidos del catálogo.' },
  direccion: { titulo: 'Dirección', descripcion: 'Se muestra en la página de contacto.' },
}

// Ajustes del negocio. Cada fila abre una hoja con su formulario.
export function SettingsPage() {
  const qc = useQueryClient()
  const { data, isPending } = useNegocio()
  const [seccion, setSeccion] = useState<Seccion | null>(null)
  const [nombre, setNombre] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [direccion, setDireccion] = useState('')
  const [logo, setLogo] = useState<File | null | undefined>(undefined) // undefined: sin cambios; null: quitar
  const [ocupado, setOcupado] = useState(false)

  const vistaLogo = useMemo(() => (logo ? URL.createObjectURL(logo) : logo === null ? null : logoUrl(data)), [logo, data])
  useEffect(() => () => {
    if (vistaLogo?.startsWith('blob:')) URL.revokeObjectURL(vistaLogo)
  }, [vistaLogo])

  const abrir = (s: Seccion) => {
    if (!data) return
    setNombre(data.business_name)
    setWhatsapp(data.whatsapp)
    setDireccion(data.address)
    setLogo(undefined)
    setSeccion(s)
  }

  const waValido = /^\+?[0-9 ]*$/.test(whatsapp)
  const digitos = whatsapp.replace(/\D/g, '').length
  const valido = seccion === 'nombre' ? !!nombre.trim() : seccion === 'whatsapp' ? waValido && whatsapp.length <= 20 : true

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (!data || !seccion || !valido) return
    setOcupado(true)
    try {
      const cambios: Record<string, unknown> =
        seccion === 'nombre'
          ? { business_name: nombre.trim(), ...(logo !== undefined && { logo }) }
          : seccion === 'whatsapp'
            ? { whatsapp: whatsapp.trim() }
            : { address: direccion.trim() }
      await pb.collection('settings').update(data.id, cambios)
      toast.success('Ajustes guardados')
      qc.invalidateQueries({ queryKey: ['settings'] })
      qc.invalidateQueries({ queryKey: ['visor'] })
      qc.invalidateQueries({ queryKey: ['libro'] }) // la vista previa del admin pinta nombre y logo
      setSeccion(null)
    } catch {
      toast.error('No se pudo guardar.')
    } finally {
      setOcupado(false)
    }
  }

  return (
    <Pantalla encabezado={<Encabezado marca titulo="Ajustes" />}>
      {isPending && <p className="p-6 text-muted-foreground">Cargando…</p>}
      {data && (
        <>
          <Grupo titulo="Negocio">
            <Fila icono={Store} titulo="Nombre y logo" sub={data.business_name} onClick={() => abrir('nombre')} />
            <Fila icono={WhatsApp} titulo="WhatsApp" sub={data.whatsapp || 'Sin número: los pedidos no tienen a dónde llegar'} onClick={() => abrir('whatsapp')} />
            <Fila icono={MapPin} titulo="Dirección" sub={data.address || 'Sin dirección'} onClick={() => abrir('direccion')} />
          </Grupo>
          <Grupo titulo="Catálogo">
            <Fila icono={Coins} titulo="Moneda" sub={data.currency} />
            <Fila icono={Palette} titulo="Color de la marca" sub="Próximamente" deshabilitada />
          </Grupo>
        </>
      )}
      <Hoja
        abierta={!!seccion}
        onClose={() => !ocupado && setSeccion(null)}
        titulo={seccion ? TITULOS[seccion].titulo : ''}
        descripcion={seccion ? TITULOS[seccion].descripcion : undefined}
        pie={
          <Button type="submit" form="form-ajustes" size="lg" className="w-full" disabled={ocupado || !valido}>
            Guardar
          </Button>
        }
      >
        <form id="form-ajustes" onSubmit={guardar} className="space-y-4">
          {seccion === 'nombre' && (
            <>
              <div className="flex items-center gap-4">
                {vistaLogo ? (
                  <img src={vistaLogo} alt="Logo" className="size-20 shrink-0 rounded-2xl border object-contain p-1" />
                ) : (
                  <span className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-primary font-titulo text-3xl text-primary-foreground">{iniciales(nombre)}</span>
                )}
                <div className="flex flex-col gap-2">
                  <label className={buttonVariants({ variant: 'outline', size: 'sm', class: 'cursor-pointer' })}>
                      <ImagePlus /> {vistaLogo ? 'Cambiar logo' : 'Subir logo'}
                      <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f && f.size > 5 * 1024 * 1024) return void toast.error('El logo pesa más de 5 MB.')
                          if (f) setLogo(f)
                        }} />
                  </label>
                  {vistaLogo && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => setLogo(null)}>
                      <Trash2 /> Quitar logo
                    </Button>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground">PNG, JPG, WebP o SVG, de preferencia con fondo transparente.</p>
              <div className="space-y-2">
                <Label htmlFor="ajuste-nombre">Nombre del negocio</Label>
                <Input id="ajuste-nombre" value={nombre} maxLength={80} onChange={(e) => setNombre(e.target.value)} />
              </div>
            </>
          )}
          {seccion === 'whatsapp' && (
            <div className="space-y-2">
              <Label htmlFor="ajuste-wa">Número</Label>
              <Input id="ajuste-wa" type="tel" inputMode="tel" value={whatsapp} maxLength={20} aria-invalid={!waValido}
                onChange={(e) => setWhatsapp(e.target.value)} placeholder="+52 55 1234 5678" />
              <p className="text-xs text-muted-foreground">
                {!waValido
                  ? 'Sólo dígitos, espacios y un + al inicio.'
                  : digitos > 0 && digitos <= 10
                    ? 'Incluye la lada del país (en México, +52) o WhatsApp no encontrará el número.'
                    : 'Con lada del país. Vacío, el catálogo no muestra el botón de pedir.'}
              </p>
            </div>
          )}
          {seccion === 'direccion' && (
            <div className="space-y-2">
              <Label htmlFor="ajuste-dir">Dirección</Label>
              <textarea id="ajuste-dir" value={direccion} maxLength={200} rows={3} onChange={(e) => setDireccion(e.target.value)}
                placeholder="Calle, número, colonia, ciudad"
                className="w-full rounded-2xl border border-input bg-background px-4 py-3 outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 dark:bg-input/30" />
            </div>
          )}
        </form>
      </Hoja>
    </Pantalla>
  )
}
