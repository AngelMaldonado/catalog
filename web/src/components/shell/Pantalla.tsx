import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

// Una pantalla del shell: encabezado fijo arriba, contenido que es lo ÚNICO que se desplaza,
// y una barra opcional abajo (total, acción principal…), encima del menú inferior.
// La ventana nunca se desplaza: el encabezado y el menú no se mueven ni los cruza el scroll.
export function Pantalla({ encabezado, abajo, children, className }: { encabezado?: ReactNode; abajo?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {encabezado && <div className="vt-encabezado shrink-0">{encabezado}</div>}
      <main className={cn('vt-contenido flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain', className)}>{children}</main>
      {abajo && (
        <div className="shrink-0 border-t bg-background px-3 py-3">
          <div className="mx-auto max-w-3xl">{abajo}</div>
        </div>
      )}
    </div>
  )
}
