import { useEffect, useRef, type ReactNode } from 'react'
import { iniciales } from '../lib/utils'
import { WhatsApp } from '../components/iconos/WhatsApp'

type Paleta = { background: string; ink: string; accent: string }

// Shell del catálogo público, mobile first. La ventana no se desplaza:
//   arriba, una barra mínima con la marca; al centro, el libro (lo único que se mueve, con el
//   dedo); abajo, el contador de páginas y la acción principal (pedir por WhatsApp).
// Detrás de todo, el fondo de portada del tema, desenfocado, con un velo del color del tema.
export function VisorShell({ negocio, logo, catalogo, whatsapp, contador, fondo, paleta, children }: {
  negocio: string; logo: string; catalogo: string; whatsapp: string; contador: string; fondo?: string; paleta?: Paleta; children: ReactNode
}) {
  const wa = whatsapp.replace(/\D/g, '')
  const mensaje = encodeURIComponent(`Hola, vi el catálogo «${catalogo}» y quiero hacer un pedido.`)
  const tinta = paleta ? { color: paleta.ink } : undefined
  return (
    <div className="relative isolate flex h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]" style={paleta && { background: paleta.background }}>
      {fondo && <FondoDifuso src={fondo} />}
      {paleta && <div aria-hidden className="absolute inset-0 -z-10" style={{ background: `color-mix(in oklab, ${paleta.background} 25%, transparent)` }} />}

      <header className="flex shrink-0 items-center gap-3 px-4 py-2" style={tinta}>
        {logo ? (
          <img src={logo} alt="" className="h-9 w-auto" />
        ) : (
          <span className="flex size-9 items-center justify-center rounded-xl bg-primary font-titulo text-lg text-primary-foreground">{iniciales(negocio)}</span>
        )}
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate font-titulo text-xl tracking-wide">{negocio}</p>
          <p className="truncate text-xs opacity-75">{catalogo}</p>
        </div>
      </header>

      {/* overflow-hidden: la hoja que se levanta no se sale sobre el encabezado ni el pie */}
      <main className="flex min-h-0 flex-1 items-center justify-center overflow-hidden px-2 select-none [-webkit-touch-callout:none]">{children}</main>

      <footer className="flex shrink-0 items-center gap-3 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]" style={tinta}>
        <span className="min-w-14 text-sm tabular-nums opacity-80" aria-live="polite">
          {contador}
        </span>
        {wa && (
          <a href={`https://wa.me/${wa}?text=${mensaje}`} target="_blank" rel="noopener"
            className="ml-auto inline-flex h-12 items-center gap-2 rounded-4xl bg-primary px-5 text-base font-semibold text-primary-foreground shadow-lg active:translate-y-px">
            <WhatsApp /> Pedir por WhatsApp
          </a>
        )}
      </footer>
    </div>
  )
}

// Desenfoque gaussiano pintado UNA vez en un canvas chico y estirado con CSS: un filter: blur
// sobre la imagen grande puede recalcularse en cada cuadro de la vuelta en un teléfono modesto.
function FondoDifuso({ src }: { src: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const img = new Image()
    img.decoding = 'async'
    img.onload = () => {
      const c = ref.current
      const ctx = c?.getContext('2d')
      if (!c || !ctx) return
      const { width: w, height: h } = c
      // cubrir el canvas con margen para que el desenfoque no deje bordes transparentes
      const k = Math.max(w / img.naturalWidth, h / img.naturalHeight) * 1.25
      const dw = img.naturalWidth * k
      const dh = img.naturalHeight * k
      ctx.filter = 'blur(3px)'
      ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh)
      c.style.opacity = '1'
    }
    img.src = src
    return () => {
      img.onload = null
    }
  }, [src])
  return <canvas ref={ref} width={72} height={128} aria-hidden className="absolute inset-0 -z-20 size-full object-cover opacity-0 transition-opacity duration-500" />
}
