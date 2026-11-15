import { lazy, Suspense, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookX, LoaderCircle } from 'lucide-react'
import { rectsTarjetas } from '../catalogo/pintar'
import { Vacio } from '../components/shell/Lista'
import { VisorShell } from '../public/VisorShell'
import { FuentePaginas, pedirVisor, type ProductoVisor, type RespuestaVisor } from './datos'
import { LibroVista, type ModoVuelta } from './LibroVista'
import type { Vista } from './motores/base'
import { registrar } from './eventos'

const Ficha = lazy(() => import('./Ficha'))

/** Productos agrupados por sección, en el orden del libro (para lectores de pantalla). */
function secciones(d: RespuestaVisor) {
  const orden = [...d.catalogo.category_order, ...d.categorias.filter((c) => !d.catalogo.category_order.includes(c.id)).map((c) => c.id)]
  const grupos = orden.map((id) => ({ titulo: d.categorias.find((c) => c.id === id)?.name ?? '', productos: d.productos.filter((p) => p.category === id) }))
  const otros = d.productos.filter((p) => !d.categorias.some((c) => c.id === p.category))
  return [...grupos, { titulo: 'Otros', productos: otros }].filter((g) => g.productos.length)
}

const horizontal = () => innerWidth > innerHeight
const suscribir = (cb: () => void) => {
  addEventListener('resize', cb)
  return () => removeEventListener('resize', cb)
}
const reducido = () => matchMedia('(prefers-reduced-motion: reduce)').matches

/** Visor del catálogo publicado (por slug, o el vigente si no hay slug). `sinVigente` se muestra
 *  cuando no hay catálogo vigente (la raíz cae a la página de contacto). */
export function VisorPage({ slug, sinVigente }: { slug?: string; sinVigente?: React.ReactNode }) {
  const datos = useQuery({ queryKey: ['visor', slug ?? ''], queryFn: () => pedirVisor(slug), staleTime: Infinity, retry: false })
  const pliego = useSyncExternalStore(suscribir, horizontal)
  const [lento, setLento] = useState(() => sessionStorage.getItem('visor-lento') === '1')
  const [vista, setVista] = useState<Vista>({ izq: null, der: 0 })
  const [ficha, setFicha] = useState<ProductoVisor | null>(null)
  const medir = new URLSearchParams(location.search).has('medir')
  const [medidas, setMedidas] = useState<number[]>([])

  const fuente = useMemo(() => (datos.data ? new FuentePaginas(datos.data, pliego ? 'pliego' : 'movil', slug) : null), [datos.data, pliego, slug])
  const pedido = datos.data?.catalogo.page_turn ?? 'realistic'
  const modo: ModoVuelta = reducido() ? 'slide' : pedido === 'realistic' && !lento ? 'realistic' : 'rigid'

  useEffect(() => {
    if (datos.data) registrar({ kind: 'view', slug })
  }, [datos.data, slug])

  if (datos.isPending)
    return (
      <div className="grid h-dvh place-items-center text-muted-foreground">
        <LoaderCircle className="size-6 animate-spin" />
      </div>
    )
  if (datos.error || !datos.data || !fuente) {
    if (!slug && sinVigente) return <>{sinVigente}</>
    return (
      <div className="flex h-dvh flex-col">
        <Vacio icono={BookX} titulo="Catálogo no disponible" texto="Este catálogo no existe o todavía no está publicado." />
      </div>
    )
  }

  const d = datos.data
  const total = fuente.total
  const visibles = [vista.izq, vista.der].filter((x): x is number => x !== null)
  const contadorBase = visibles.length === 2 ? `${visibles[0] + 1}–${visibles[1] + 1} / ${total}` : `${(visibles[0] ?? 0) + 1} / ${total}`
  const contador = medir ? `${contadorBase} · ${modo} · ${medidas.map((f) => Math.round(f)).join(' ')}` : contadorBase
  const paginaActual = vista.der ?? vista.izq ?? 0

  function tocar(i: number, x: number, y: number) {
    const p = fuente!.paginas[i]
    if (p.tipo !== 'productos') return
    // geometría normalizada de las tarjetas (página de 100 × 177.8)
    const k = rectsTarjetas(100, 100 / (9 / 16), Number(d.catalogo.layout)).findIndex((r) => x * 100 >= r.x && x * 100 <= r.x + r.w && y * 177.8 >= r.y && y * 177.8 <= r.y + r.h)
    const pr = k >= 0 ? p.productos[k] : undefined
    if (pr) setFicha(fuente!.producto(pr.id) ?? null)
  }

  return (
    <VisorShell negocio={d.negocio.nombre} logo={d.negocio.logo} catalogo={d.catalogo.name} whatsapp={d.negocio.whatsapp} contador={contador}>
      <LibroVista
        fuente={fuente}
        modo={modo}
        pliego={pliego}
        pagina={paginaActual}
        onVista={setVista}
        onToque={tocar}
        onFps={medir ? (f) => setMedidas((m) => [...m, f].slice(-6)) : undefined}
        onDegradar={(motivo) => {
          console.info(`[visor] página realista → hoja rígida (${motivo})`)
          sessionStorage.setItem('visor-lento', '1')
          setLento(true)
        }}
      />
      {/* El libro es canvas (protección contra copia): para lectores de pantalla, el mismo
          contenido en el DOM, oculto a la vista; cada producto abre su ficha. */}
      <nav className="sr-only" aria-label={`Contenido de ${d.catalogo.name}`}>
        <h1>{d.catalogo.name}</h1>
        {secciones(d).map((s) => (
          <section key={s.titulo}>
            <h2>{s.titulo}</h2>
            <ul>
              {s.productos.map((p) => (
                <li key={p.id}>
                  <button type="button" onClick={() => setFicha(p)}>
                    {p.name}, {new Intl.NumberFormat('es-MX', { style: 'currency', currency: d.negocio.moneda || 'MXN', maximumFractionDigits: 0 }).format(p.price)}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </nav>
      <Suspense fallback={null}>
        {ficha && <Ficha fuente={fuente} producto={ficha} whatsapp={d.negocio.whatsapp} moneda={d.negocio.moneda} slug={slug} onClose={() => setFicha(null)} />}
      </Suspense>
    </VisorShell>
  )
}
