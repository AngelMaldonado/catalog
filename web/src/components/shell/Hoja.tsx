import type { ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { Drawer } from 'vaul'
import { useEscritorio } from '../../lib/useMediaQuery'

// Hoja responsiva (patrón de Comandas): en el celular sube desde abajo y se cierra deslizando
// (vaul); en pantallas grandes es un diálogo centrado (Radix Dialog).
export function Hoja({ abierta, titulo, descripcion, onClose, children, pie, fuenteTitulo }: {
  abierta: boolean; titulo: string; descripcion?: string; onClose: () => void; children: ReactNode; pie?: ReactNode
  /** otra familia para el título (p. ej. la fuente del catálogo en la ficha del visor) */
  fuenteTitulo?: string
}) {
  const estilo = fuenteTitulo ? { fontFamily: fuenteTitulo } : undefined
  const escritorio = useEscritorio()
  const alCambiar = (o: boolean) => {
    if (!o) onClose()
  }
  if (escritorio) {
    return (
      <Dialog.Root open={abierta} onOpenChange={alCambiar}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" />
          <Dialog.Content className="fixed top-1/2 left-1/2 z-50 flex max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 flex-col rounded-4xl bg-background shadow-xl ring-1 ring-foreground/10">
            <div className="px-6 pt-6 pb-3">
              <Dialog.Title className="font-titulo text-2xl tracking-wide" style={estilo}>{titulo}</Dialog.Title>
              {descripcion && <Dialog.Description className="text-sm text-muted-foreground">{descripcion}</Dialog.Description>}
            </div>
            <div className="overflow-y-auto px-6 pb-4">{children}</div>
            {pie && <div className="border-t px-6 py-4">{pie}</div>}
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    )
  }
  return (
    <Drawer.Root open={abierta} onOpenChange={alCambiar}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 flex max-h-[92dvh] flex-col rounded-t-4xl bg-background outline-none">
          <div className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-muted" aria-hidden />
          <div className="px-4 pt-3 pb-2">
            <Drawer.Title className="font-titulo text-2xl tracking-wide" style={estilo}>{titulo}</Drawer.Title>
            {descripcion && <Drawer.Description className="text-sm text-muted-foreground">{descripcion}</Drawer.Description>}
          </div>
          <div className="overflow-y-auto px-4 pb-4">{children}</div>
          {pie && <div className="border-t px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{pie}</div>}
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
