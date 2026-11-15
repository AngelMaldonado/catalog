import type { ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'
import { iniciales } from '../lib/utils'

// Shell del catálogo público, mobile first. La ventana no se desplaza:
//   arriba, una barra mínima con la marca; al centro, el libro (lo único que se mueve, con el
//   dedo); abajo, el contador de páginas y la acción principal (pedir por WhatsApp).
export function VisorShell({ negocio, logo, catalogo, whatsapp, contador, children }: {
  negocio: string; logo: string; catalogo: string; whatsapp: string; contador: string; children: ReactNode
}) {
  const wa = whatsapp.replace(/\D/g, '')
  const mensaje = encodeURIComponent(`Hola, vi el catálogo «${catalogo}» y quiero hacer un pedido.`)
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
      <header className="relative z-10 flex shrink-0 items-center gap-3 bg-background px-4 py-2">
        {logo ? (
          <img src={logo} alt="" className="h-9 w-auto" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary font-titulo text-lg text-primary-foreground">{iniciales(negocio)}</span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-titulo text-xl tracking-wide">{negocio}</p>
          <p className="truncate text-xs text-muted-foreground">{catalogo}</p>
        </div>
      </header>

      <main className="relative z-0 flex min-h-0 flex-1 items-center justify-center px-2 select-none [-webkit-touch-callout:none]">{children}</main>

      <footer className="relative z-10 flex shrink-0 items-center gap-3 bg-background px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <span className="min-w-14 text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {contador}
        </span>
        {wa && (
          <a href={`https://wa.me/${wa}?text=${mensaje}`} target="_blank" rel="noopener"
            className="ml-auto inline-flex h-12 items-center gap-2 rounded-4xl bg-primary px-5 text-base font-semibold text-primary-foreground active:translate-y-px">
            <MessageCircle className="size-5" /> Pedir por WhatsApp
          </a>
        )}
      </footer>
    </div>
  )
}
