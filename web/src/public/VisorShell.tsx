import type { ReactNode } from 'react'
import { MessageCircle } from 'lucide-react'
import type { Catalog, Settings } from '../lib/types'
import { iniciales } from '../lib/utils'
import { logoUrl } from '../lib/negocio'

// Shell del catálogo público, mobile first. La ventana no se desplaza:
//   arriba, una barra mínima con la marca; al centro, el libro (lo único que se mueve, con
//   el dedo); abajo, el contador de páginas y la acción principal (pedir por WhatsApp).
// El visor (hoja rígida / página realista, según el catálogo) se monta en `children`.
export function VisorShell({ negocio, catalogo, pagina, total, children }: { negocio: Settings; catalogo: Catalog; pagina: number; total: number; children: ReactNode }) {
  const logo = logoUrl(negocio)
  const wa = negocio.whatsapp.replace(/\D/g, '')
  const mensaje = encodeURIComponent(`Hola, vi el catálogo «${catalogo.name}» y quiero hacer un pedido.`)
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
      <header className="flex shrink-0 items-center gap-3 px-4 py-2">
        {logo ? (
          <img src={logo} alt="" className="h-9 w-auto" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary font-titulo text-lg text-primary-foreground">{iniciales(negocio.business_name)}</span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-titulo text-xl tracking-wide">{negocio.business_name}</p>
          <p className="truncate text-xs text-muted-foreground">{catalogo.name}</p>
        </div>
      </header>

      <main className="relative flex min-h-0 flex-1 items-center justify-center px-2 select-none">{children}</main>

      <footer className="flex shrink-0 items-center gap-3 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <span className="min-w-14 text-sm text-muted-foreground tabular-nums" aria-live="polite">
          {total > 0 ? `${pagina} / ${total}` : ''}
        </span>
        {wa && (
          <a
            href={`https://wa.me/${wa}?text=${mensaje}`}
            target="_blank"
            rel="noopener"
            className="ml-auto inline-flex h-12 items-center gap-2 rounded-4xl bg-primary px-5 text-base font-semibold text-primary-foreground active:translate-y-px"
          >
            <MessageCircle className="size-5" /> Pedir por WhatsApp
          </a>
        )}
      </footer>
    </div>
  )
}
