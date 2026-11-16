import { useEffect, useRef, useState } from 'react'
import { Hoja } from '../components/shell/Hoja'
import { cn } from '../lib/utils'
import type { FuentePaginas, ProductoVisor } from './datos'
import { registrar } from './eventos'
import { WhatsApp } from '../components/iconos/WhatsApp'

const dinero = (n: number, moneda: string) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: moneda || 'MXN', maximumFractionDigits: 0 }).format(n)

// Ficha de producto del visor (se carga al primer toque): mockup grande pintado en canvas
// (nunca <img>), color, talla y «Pedir por WhatsApp» con el mensaje armado.
export default function Ficha({ fuente, producto, whatsapp, moneda, slug, onClose, fuenteTitulo }: {
  fuente: FuentePaginas; producto: ProductoVisor | null; whatsapp: string; moneda: string; slug?: string; onClose: () => void
  /** la fuente del catálogo: sólo para el nombre de la prenda; lo demás se queda legible */
  fuenteTitulo?: string
}) {
  const [color, setColor] = useState('')
  const [variante, setVariante] = useState('')
  const [talla, setTalla] = useState('')
  const lienzo = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!producto) return
    setColor(producto.colores[0]?.name ?? '')
    setVariante(producto.variantes[0]?.id ?? '')
    setTalla(producto.sizes.length === 1 ? producto.sizes[0] : '')
  }, [producto])

  useEffect(() => {
    if (!producto || !color) return
    let vivo = true
    fuente.render(producto.id, color, '960', variante || undefined).then((bmp) => {
      const c = lienzo.current
      if (!vivo || !c || !bmp) return
      c.width = bmp.width
      c.height = bmp.height
      const ctx = c.getContext('2d')!
      ctx.clearRect(0, 0, c.width, c.height)
      ctx.drawImage(bmp, 0, 0)
    })
    return () => {
      vivo = false
    }
  }, [fuente, producto, color, variante])

  const nombreVariante = producto?.variantes.find((v) => v.id === variante)?.name
  const numero = whatsapp.replace(/\D/g, '')
  const faltaTalla = (producto?.sizes.length ?? 0) > 1 && !talla
  const mensaje = producto
    ? `Hola, quiero pedir «${producto.name}»${nombreVariante ? `, ${nombreVariante.toLowerCase()}` : ''}${color ? `, color ${color}` : ''}${talla ? `, talla ${talla}` : ''} (${dinero(producto.price, moneda)}).`
    : ''

  return (
    <Hoja
      abierta={!!producto}
      onClose={onClose}
      titulo={producto?.name ?? ''}
      fuenteTitulo={fuenteTitulo}
      descripcion={producto ? dinero(producto.price, moneda) : undefined}
      pie={
        numero ? (
          <a
            href={faltaTalla ? undefined : `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`}
            target="_blank"
            rel="noopener"
            aria-disabled={faltaTalla}
            onClick={(e) => {
              if (faltaTalla) return e.preventDefault()
              registrar({ kind: 'click', slug, product: producto!.id, color, size: talla })
            }}
            className={cn('flex h-12 w-full items-center justify-center gap-2 rounded-4xl bg-primary text-base font-semibold text-primary-foreground', faltaTalla && 'opacity-50')}
          >
            <WhatsApp /> {faltaTalla ? 'Elige tu talla' : 'Pedir por WhatsApp'}
          </a>
        ) : (
          <p className="text-center text-sm text-muted-foreground">Este negocio todavía no configuró su WhatsApp.</p>
        )
      }
    >
      {producto && (
        <div className="space-y-4 select-none [-webkit-touch-callout:none]">
          <canvas ref={lienzo} onContextMenu={(e) => e.preventDefault()} className="mx-auto block aspect-square w-full max-w-sm rounded-3xl bg-muted/50" />
          {producto.variantes.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Modelo</p>
              <div className="flex flex-wrap gap-2">
                {producto.variantes.map((v) => (
                  <button key={v.id} type="button" aria-pressed={variante === v.id} onClick={() => setVariante(v.id)}
                    className={cn('h-10 rounded-full border px-4 text-sm font-medium', variante === v.id ? 'border-acento bg-acento-tinte text-acento-texto' : 'text-muted-foreground')}>
                    {v.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {producto.colores.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Color: {color}</p>
              <div className="flex flex-wrap gap-2">
                {producto.colores.map((c) => (
                  <button key={c.name} type="button" aria-label={c.name} aria-pressed={color === c.name} onClick={() => setColor(c.name)}
                    className={cn('size-10 rounded-full ring-1 ring-black/15', color === c.name && 'ring-2 ring-acento ring-offset-2 ring-offset-background')} style={{ background: c.hex }} />
                ))}
              </div>
            </div>
          )}
          {producto.sizes.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Talla</p>
              <div className="flex flex-wrap gap-2">
                {producto.sizes.map((s) => (
                  <button key={s} type="button" aria-pressed={talla === s} onClick={() => setTalla(s)}
                    className={cn('h-10 min-w-12 rounded-full border px-3 text-sm font-medium', talla === s ? 'border-acento bg-acento-tinte text-acento-texto' : 'text-muted-foreground')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Hoja>
  )
}
