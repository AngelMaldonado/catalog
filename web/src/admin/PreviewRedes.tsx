import { useState } from 'react'
import { ImageOff } from 'lucide-react'
import type { Catalog } from '../lib/types'
import { pb } from '../lib/pb'
import { useNegocio, logoUrl } from '../lib/negocio'
import { iniciales } from '../lib/utils'
import { textosOg } from '../catalogo/og'
import { Segmentado } from '../components/ui/controles'

type Red = 'facebook' | 'instagram'

// Cómo se ve el enlace del catálogo al compartirlo. Usa lo mismo que el servidor pone en las
// etiquetas Open Graph: la imagen 1200×630 que se genera al publicar, el título y la descripción.
// Las tarjetas imitan la app en modo claro (colores fijos, no los del tema del admin).
export function PreviewRedes({ catalogo, imagen: propia }: { catalogo: Catalog; /** otra imagen (p. ej. sin guardar) en vez de la publicada */ imagen?: string }) {
  const { data: negocio } = useNegocio()
  const [red, setRed] = useState<Red>('facebook')
  const nombre = negocio?.business_name ?? ''
  const { titulo, descripcion } = textosOg(catalogo.name, nombre)
  const imagen = propia ?? (catalogo.og_image ? pb.files.getURL(catalogo, catalogo.og_image) : null)
  const dominio = location.host
  const logo = logoUrl(negocio)
  const avatar = logo ? (
    <img src={logo} alt="" className="size-10 shrink-0 rounded-full bg-white object-contain" />
  ) : (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#1c1e21] text-sm font-semibold text-white">{iniciales(nombre)}</span>
  )
  const foto = (clase: string) =>
    imagen ? (
      <img src={imagen} alt="" className={`block aspect-[1200/630] w-full object-cover ${clase}`} />
    ) : (
      <div className={`flex aspect-[1200/630] w-full flex-col items-center justify-center gap-1 bg-[#e4e6eb] text-xs text-[#65676b] ${clase}`}>
        <ImageOff className="size-5" /> Sin imagen: vuelve a publicar el catálogo
      </div>
    )

  return (
    <section className="space-y-3">
      <h3 className="text-sm font-medium">Así se ve al compartir el enlace</h3>
      <Segmentado<Red> etiqueta="Red social" valor={red} onCambio={setRed} opciones={[{ valor: 'facebook', texto: 'Facebook' }, { valor: 'instagram', texto: 'Instagram' }]} />

      {red === 'facebook' ? (
        <div className="overflow-hidden rounded-2xl border border-[#dadde1] bg-white text-[#050505] shadow-sm">
          <div className="flex items-center gap-2 p-3">
            {avatar}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[15px] font-semibold">{nombre}</p>
              <p className="text-xs text-[#65676b]">Ahora · Público</p>
            </div>
          </div>
          {foto('')}
          <div className="bg-[#f0f2f5] px-3 py-2.5">
            <p className="truncate text-xs text-[#65676b] uppercase">{dominio}</p>
            <p className="line-clamp-2 text-[15px] leading-snug font-semibold">{titulo}</p>
            <p className="truncate text-sm text-[#65676b]">{descripcion}</p>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-white p-3 text-[#000] shadow-sm ring-1 ring-black/5">
          <p className="mb-2 text-center text-[11px] text-[#737373]">Mensaje directo</p>
          <div className="ml-auto w-64 max-w-[85%] overflow-hidden rounded-[18px] bg-[#efefef]">
            {foto('')}
            <div className="px-3 py-2">
              <p className="line-clamp-2 text-sm leading-snug font-semibold">{titulo}</p>
              <p className="truncate text-xs text-[#737373]">{dominio}</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        {red === 'facebook'
          ? 'Facebook guarda la vista previa la primera vez que alguien comparte el enlace. Si cambias la portada, refréscala pegando el enlace en developers.facebook.com/tools/debug.'
          : 'Instagram sólo muestra la tarjeta en mensajes directos. En historias el enlace va como sticker y en publicaciones no se puede tocar.'}
      </p>
    </section>
  )
}
