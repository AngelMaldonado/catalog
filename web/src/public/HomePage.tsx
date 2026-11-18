import type { ComponentType } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router'
import { AtSign, ChevronRight, LoaderCircle, MapPin, Music2, Users } from 'lucide-react'
import { WhatsApp } from '../components/iconos/WhatsApp'
import { pb } from '../lib/pb'
import type { Catalog } from '../lib/types'
import { useNegocio, logoUrl } from '../lib/negocio'
import { iniciales } from '../lib/utils'

type Tarjeta = Pick<Catalog, 'id' | 'collectionId' | 'collectionName' | 'name' | 'slug' | 'og_image'>

// La raíz lista los catálogos publicados (cada uno vive en /c/:slug) y el contacto del negocio.
// Ya no hay «catálogo vigente»: todos los catálogos se abren desde aquí o desde su enlace.
export function HomePage() {
  const { data: negocio, isPending } = useNegocio()
  const catalogos = useQuery({
    queryKey: ['publicados'],
    queryFn: () =>
      pb.collection('catalogs').getFullList<Tarjeta>({ filter: 'status = "published"', sort: '-created', fields: 'id,collectionId,collectionName,name,slug,og_image' }),
  })
  if (isPending || catalogos.isPending)
    return (
      <div className="grid h-dvh place-items-center text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
      </div>
    )
  const logo = logoUrl(negocio)
  const wa = negocio?.whatsapp.replace(/\D/g, '')
  const enlaces = [
    wa && { href: `https://wa.me/${wa}`, texto: 'WhatsApp', icono: WhatsApp },
    negocio?.instagram && { href: negocio.instagram, texto: 'Instagram', icono: AtSign },
    negocio?.facebook && { href: negocio.facebook, texto: 'Facebook', icono: Users },
    negocio?.tiktok && { href: negocio.tiktok, texto: 'TikTok', icono: Music2 },
  ].filter(Boolean) as { href: string; texto: string; icono: ComponentType<{ className?: string }> }[]
  const lista = catalogos.data ?? []

  return (
    <div className="h-dvh overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col items-center justify-center gap-6 px-4 py-10 text-center">
        {logo ? (
          <img src={logo} alt="" className="h-28 w-auto max-w-full object-contain" />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-3xl bg-primary font-titulo text-4xl text-primary-foreground">{iniciales(negocio?.business_name ?? '')}</span>
        )}
        <h1 className="font-titulo text-5xl tracking-wide">{negocio?.business_name}</h1>

        {lista.length > 0 && (
          <section className="w-full space-y-3 text-left" aria-label="Catálogos">
            <h2 className="px-1 text-sm font-medium text-muted-foreground">{lista.length === 1 ? 'Catálogo' : 'Catálogos'}</h2>
            <ul className="space-y-3">
              {lista.map((c) => (
                <li key={c.id}>
                  <Link to={`/c/${c.slug}`} viewTransition className="block overflow-hidden rounded-3xl border bg-card shadow-sm active:bg-muted">
                    {c.og_image ? (
                      <img src={pb.files.getURL(c, c.og_image)} alt="" loading="lazy" className="block aspect-[1200/630] w-full object-cover" />
                    ) : (
                      <span className="flex aspect-[1200/630] w-full items-center justify-center bg-muted px-4 font-titulo text-4xl">{c.name}</span>
                    )}
                    <span className="flex items-center gap-3 p-4">
                      <span className="min-w-0 flex-1 truncate font-semibold">{c.name}</span>
                      <ChevronRight className="size-5 text-muted-foreground" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {enlaces.length > 0 && (
          <ul className="w-full divide-y overflow-hidden rounded-3xl border bg-card text-left shadow-sm">
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
            <MapPin className="size-4 shrink-0" /> {negocio.address}
          </p>
        )}
      </div>
    </div>
  )
}
