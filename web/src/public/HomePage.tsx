import { AtSign, LoaderCircle, MapPin, MessageCircle, Music2, Users } from 'lucide-react'
import { useNegocio, logoUrl } from '../lib/negocio'
import { iniciales } from '../lib/utils'
import { VisorCatalogo } from './CatalogPage'

// La raíz muestra el catálogo vigente. Sin catálogo vigente publicado: una página simple con el
// logo y el contacto (decidido en el hilo «Editor de catálogo»).
export function HomePage() {
  const { data: negocio, isPending } = useNegocio()
  if (isPending)
    return (
      <div className="grid h-dvh place-items-center text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
      </div>
    )
  const vigente = negocio?.expand?.current_catalog
  if (vigente && vigente.status === 'published') return <VisorCatalogo catalogo={vigente} />

  const logo = logoUrl(negocio)
  const wa = negocio?.whatsapp.replace(/\D/g, '')
  const enlaces = [
    wa && { href: `https://wa.me/${wa}`, texto: 'WhatsApp', icono: MessageCircle },
    negocio?.instagram && { href: negocio.instagram, texto: 'Instagram', icono: AtSign },
    negocio?.facebook && { href: negocio.facebook, texto: 'Facebook', icono: Users },
    negocio?.tiktok && { href: negocio.tiktok, texto: 'TikTok', icono: Music2 },
  ].filter(Boolean) as { href: string; texto: string; icono: typeof MessageCircle }[]

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-5 py-10 text-center">
      {logo ? (
        <img src={logo} alt="" className="h-28 w-auto" />
      ) : (
        <span className="flex size-20 items-center justify-center rounded-3xl bg-primary font-titulo text-4xl text-primary-foreground">{iniciales(negocio?.business_name ?? '')}</span>
      )}
      <h1 className="font-titulo text-5xl tracking-wide">{negocio?.business_name}</h1>
      {enlaces.length > 0 && (
        <ul className="w-full max-w-sm divide-y overflow-hidden rounded-3xl border bg-card text-left shadow-sm">
          {enlaces.map((e) => (
            <li key={e.texto}>
              <a href={e.href} target="_blank" rel="noopener" className="flex items-center gap-3 p-4 font-semibold active:bg-muted">
                <span className="flex size-10 items-center justify-center rounded-2xl bg-accent"><e.icono className="size-5" /></span>
                {e.texto}
              </a>
            </li>
          ))}
        </ul>
      )}
      {negocio?.address && (
        <p className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="size-4" /> {negocio.address}
        </p>
      )}
    </div>
  )
}
