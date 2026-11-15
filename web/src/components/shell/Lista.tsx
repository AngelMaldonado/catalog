import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Link, useLocation } from 'react-router'
import { ChevronRight } from 'lucide-react'
import { cn } from '../../lib/utils'
import { marcarDireccion } from '../../lib/transicion'

// Grupo de filas en una tarjeta (patrón de las listas de Comandas).
export function Grupo({ titulo, children, className }: { titulo?: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn('mx-3 mt-3 sm:mx-auto sm:w-full sm:max-w-3xl', className)}>
      {titulo && <h2 className="mb-1.5 px-4 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{titulo}</h2>}
      <ul className="divide-y overflow-hidden rounded-3xl border bg-card shadow-sm">{children}</ul>
    </section>
  )
}

type FilaProps = { icono?: LucideIcon; titulo: string; sub?: string; extra?: ReactNode; to?: string; onClick?: () => void; deshabilitada?: boolean }

export function Fila({ icono: Icono, titulo, sub, extra, to, onClick, deshabilitada }: FilaProps) {
  const { pathname } = useLocation()
  const cuerpo = (
    <>
      {Icono && (
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-2xl', deshabilitada ? 'bg-muted text-muted-foreground' : 'bg-accent text-accent-foreground')}>
          <Icono className="size-5" />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{titulo}</span>
        {sub && <span className="block truncate text-sm text-muted-foreground">{sub}</span>}
      </span>
      {extra}
      {(to || onClick) && !deshabilitada && <ChevronRight className="size-4 text-muted-foreground" />}
    </>
  )
  const clase = 'flex w-full items-center gap-3 p-4 text-left'
  if (deshabilitada) return <li><div className={cn(clase, 'cursor-not-allowed opacity-50')} aria-disabled>{cuerpo}</div></li>
  if (to)
    return (
      <li>
        <Link to={to} viewTransition onClick={() => marcarDireccion(pathname, to)} className={cn(clase, 'active:bg-muted')}>{cuerpo}</Link>
      </li>
    )
  if (onClick) return <li><button type="button" onClick={onClick} className={cn(clase, 'active:bg-muted')}>{cuerpo}</button></li>
  return <li><div className={clase}>{cuerpo}</div></li>
}

/** Pantalla vacía o de error, centrada en el espacio disponible. */
export function Vacio({ icono: Icono, titulo, texto, children }: { icono: LucideIcon; titulo: string; texto?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="rounded-full bg-muted p-4 text-muted-foreground"><Icono className="size-8" /></span>
      <p className="font-titulo text-3xl tracking-wide">{titulo}</p>
      {texto && <p className="max-w-sm text-muted-foreground">{texto}</p>}
      {children}
    </div>
  )
}
