import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import { ChevronLeft } from 'lucide-react'
import { ButtonLink } from '../ui/button'
import { pb } from '../../lib/pb'
import { cn, iniciales } from '../../lib/utils'
import { logoUrl, useNegocio } from '../../lib/negocio'
import { marcarDireccion } from '../../lib/transicion'

// Barra superior de la pantalla (patrón de Comandas):
//   atrás · marca del negocio · título (fuente de títulos) · acción · avatar → Perfil.
export function Encabezado({ titulo, atras, marca = false, accion, debajo }: { titulo: string; atras?: string; marca?: boolean; accion?: ReactNode; debajo?: ReactNode }) {
  const { pathname } = useLocation()
  const { data: negocio } = useNegocio()
  const logo = logoUrl(negocio)
  const usuario = pb.authStore.record
  return (
    <header className="border-b bg-background">
      {/* altura fija: ni un botón de acción ni el avatar hacen crecer la barra */}
      <div className="flex h-14 items-center gap-1 px-2">
        {atras && (
          <ButtonLink to={atras} variant="ghost" size="icon" aria-label="Atrás">
            <ChevronLeft className="size-6" />
          </ButtonLink>
        )}
        {marca &&
          (logo ? (
            <img src={logo} alt={negocio?.business_name ?? ''} className="ml-1 h-10 w-auto" />
          ) : (
            <span className="ml-1 flex size-10 items-center justify-center rounded-2xl bg-primary font-titulo text-xl text-primary-foreground">
              {iniciales(negocio?.business_name ?? '')}
            </span>
          ))}
        <div className={cn('min-w-0 flex-1', !atras && 'pl-2')}>
          <h1 className="truncate font-titulo text-2xl leading-tight tracking-wide">{titulo}</h1>
        </div>
        {accion}
        {marca && usuario && !pathname.startsWith('/admin/perfil') && (
          <Link
            to="/admin/perfil"
            viewTransition
            onClick={() => marcarDireccion(pathname, '/admin/perfil')}
            aria-label="Perfil"
            className="mr-1 flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-semibold text-accent-foreground"
          >
            {iniciales(usuario.name || usuario.email)}
          </Link>
        )}
      </div>
      {debajo}
    </header>
  )
}
