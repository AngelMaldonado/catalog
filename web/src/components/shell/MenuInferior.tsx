import type { LucideIcon } from 'lucide-react'
import { NavLink, useLocation } from 'react-router'
import { cn } from '../../lib/utils'
import { marcarDireccion } from '../../lib/transicion'

export type ItemMenu = { to: string; texto: string; icono: LucideIcon; exacto?: boolean; /** activo también en estas rutas (más adentro) */ tambien?: string }

// Menú inferior de pestañas (patrón de Comandas): tiles de 56 px, el activo con tinte del acento.
export function MenuInferior({ items }: { items: ItemMenu[] }) {
  const { pathname } = useLocation()
  return (
    <nav className="vt-menu shrink-0 border-t bg-background pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto flex max-w-2xl">
        {items.map((it) => (
          <li key={it.to} className="flex-1 p-1.5">
            <NavLink
              to={it.to}
              end={it.exacto}
              viewTransition
              onClick={() => marcarDireccion(pathname, it.to)}
              className={({ isActive: a }) => {
                const isActive = a || (!!it.tambien && pathname.startsWith(it.tambien))
                return cn(
                  'flex h-14 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-medium transition-colors',
                  isActive ? 'bg-acento-tinte text-acento-texto' : 'text-muted-foreground hover:bg-muted',
                )
              }}
            >
              {({ isActive: a }) => {
                const isActive = a || (!!it.tambien && pathname.startsWith(it.tambien))
                return (
                <>
                  <it.icono className="size-5" strokeWidth={isActive ? 2.25 : 1.75} />
                  {it.texto}
                </>
                )
              }}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
