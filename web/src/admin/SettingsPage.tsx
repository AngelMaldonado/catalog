import { Coins, MapPin, MessageCircle, Palette, Store } from 'lucide-react'
import { useNegocio } from '../lib/negocio'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Fila, Grupo } from '../components/shell/Lista'

// Ajustes del negocio. Por ahora de sólo lectura; la edición de cada sección es una pantalla
// propia (más adentro: entra desde la derecha).
export function SettingsPage() {
  const { data, isPending } = useNegocio()
  return (
    <Pantalla encabezado={<Encabezado marca titulo="Ajustes" />}>
      {isPending && <p className="p-6 text-muted-foreground">Cargando…</p>}
      {data && (
        <>
          <Grupo titulo="Negocio">
            <Fila icono={Store} titulo="Nombre y logo" sub={data.business_name} />
            <Fila icono={MessageCircle} titulo="WhatsApp" sub={data.whatsapp || 'Sin número: los pedidos no tienen a dónde llegar'} />
            <Fila icono={MapPin} titulo="Dirección" sub={data.address || '—'} />
          </Grupo>
          <Grupo titulo="Catálogo">
            <Fila icono={Coins} titulo="Moneda" sub={data.currency} />
            <Fila icono={Palette} titulo="Color de la marca" sub="Próximamente" deshabilitada />
          </Grupo>
        </>
      )}
    </Pantalla>
  )
}
