import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Check, Copy, Download, Share2 } from 'lucide-react'
import type { Catalog } from '../lib/types'
import { useNegocio } from '../lib/negocio'
import { Hoja } from '../components/shell/Hoja'
import { Button, ButtonLink } from '../components/ui/button'
import { PreviewRedes } from './PreviewRedes'

// Compartir un catálogo publicado: enlace, QR (para imprimir o mandar por WhatsApp), el menú
// de compartir del teléfono y cómo se ve el enlace en Facebook e Instagram.
export function Compartir({ catalogo, abierta, onClose }: { catalogo: Catalog; abierta: boolean; onClose: () => void }) {
  const { data: negocio } = useNegocio()
  const [qr, setQr] = useState('')
  const [copiado, setCopiado] = useState(false)
  const vigente = negocio?.current_catalog === catalogo.id
  const url = `${location.origin}/c/${catalogo.slug}`
  const publicado = catalogo.status === 'published'

  useEffect(() => {
    if (!abierta || !publicado) return
    // a una imagen (no a un canvas): toCanvas fija el ancho en línea y rompe el tamaño
    QRCode.toDataURL(url, { width: 640, margin: 2, errorCorrectionLevel: 'M' }).then(setQr)
  }, [abierta, publicado, url])

  const copiar = async () => {
    await navigator.clipboard.writeText(url)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1500)
  }
  const descargar = () => {
    const a = document.createElement('a')
    a.href = qr
    a.download = `qr-${catalogo.slug}.png`
    a.click()
  }
  const compartir = () => navigator.share?.({ title: catalogo.name, text: `${negocio?.business_name ?? ''}: ${catalogo.name}`, url })

  return (
    <Hoja abierta={abierta} onClose={onClose} titulo="Compartir" descripcion={publicado ? undefined : 'Publica el catálogo (en Ajustes) para poder compartirlo.'}>
      {publicado ? (
        <div className="space-y-4">
          {qr && <img src={qr} alt={`Código QR de ${url}`} className="mx-auto block size-56 rounded-2xl bg-white" />}
          <p className="rounded-2xl bg-muted px-3 py-2.5 text-center font-mono text-sm break-all">{url}</p>
          {vigente && <p className="text-center text-sm text-muted-foreground">También se ve en la raíz: {location.origin}</p>}
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" size="sm" onClick={copiar}>
              {copiado ? <Check /> : <Copy />} {copiado ? 'Copiado' : 'Copiar'}
            </Button>
            <Button variant="outline" size="sm" onClick={descargar}>
              <Download /> QR
            </Button>
            <Button size="sm" onClick={compartir} disabled={!('share' in navigator)}>
              <Share2 /> Enviar
            </Button>
          </div>
          <PreviewRedes catalogo={catalogo} />
          <ButtonLink to={`/admin/catalogos/${catalogo.id}/redes`} variant="outline" className="w-full">
            Editar la imagen para redes
          </ButtonLink>
        </div>
      ) : null}
    </Hoja>
  )
}
