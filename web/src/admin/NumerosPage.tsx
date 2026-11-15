import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams } from 'react-router'
import { LoaderCircle } from 'lucide-react'
import { pb } from '../lib/pb'
import type { Catalog, Product } from '../lib/types'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'

interface Evento {
  kind: 'view' | 'click'
  day: string
  product: string
  color: string
  size: string
}

const DIAS = 14
const fecha = (d: Date) => d.toISOString().slice(0, 10)
const corto = (dia: string) => new Date(`${dia}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })

// Contadores mínimos (hilo «Visor público»): vistas únicas por día y pedidos por WhatsApp por
// producto. Una sola serie: barras de un color (token --grafica, validado en claro y oscuro).
export function NumerosPage() {
  const { id = '' } = useParams()
  const desde = fecha(new Date(Date.now() - (DIAS - 1) * 86400000))
  const catalogo = useQuery({ queryKey: ['catalog', id], queryFn: () => pb.collection('catalogs').getOne<Catalog>(id) })
  const eventos = useQuery({
    queryKey: ['events', id, desde],
    queryFn: () => pb.collection('events').getFullList<Evento>({ filter: pb.filter('catalog = {:c} && day >= {:d}', { c: id, d: desde }), fields: 'kind,day,product,color,size' }),
  })
  const productos = useQuery({ queryKey: ['products', id, 'nombres'], queryFn: () => pb.collection('products').getFullList<Product>({ filter: pb.filter('catalog = {:c}', { c: id }), fields: 'id,name' }) })

  const datos = useMemo(() => {
    const ev = eventos.data ?? []
    const dias = Array.from({ length: DIAS }, (_, k) => fecha(new Date(Date.now() - (DIAS - 1 - k) * 86400000)))
    const vistas = dias.map((d) => ({ dia: d, n: ev.filter((e) => e.kind === 'view' && e.day === d).length }))
    const clics = ev.filter((e) => e.kind === 'click')
    const porProducto = new Map<string, { n: number; detalle: Map<string, number> }>()
    for (const c of clics) {
      const x = porProducto.get(c.product) ?? { n: 0, detalle: new Map() }
      x.n++
      const k = [c.color, c.size].filter(Boolean).join(' · ') || 'sin detalle'
      x.detalle.set(k, (x.detalle.get(k) ?? 0) + 1)
      porProducto.set(c.product, x)
    }
    const top = [...porProducto.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8)
    return { vistas, totalVistas: vistas.reduce((s, v) => s + v.n, 0), totalClics: clics.length, top }
  }, [eventos.data])

  const max = Math.max(1, ...datos.vistas.map((v) => v.n))
  const maxTop = Math.max(1, ...datos.top.map(([, x]) => x.n))
  const nombre = (pid: string) => productos.data?.find((p) => p.id === pid)?.name ?? 'Producto eliminado'

  return (
    <Pantalla encabezado={<Encabezado titulo="Números" atras={`/admin/catalogos/${id}`} />}>
      <div className="mx-auto w-full max-w-3xl space-y-4 p-3">
        <p className="px-1 text-sm text-muted-foreground">{catalogo.data?.name} · últimos {DIAS} días</p>
        {eventos.isPending ? (
          <div className="grid place-items-center p-10 text-muted-foreground"><LoaderCircle className="size-6 animate-spin" /></div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Tile titulo="Vistas" valor={datos.totalVistas} nota="una por dispositivo y día" />
              <Tile titulo="Pedidos por WhatsApp" valor={datos.totalClics} nota="toques en «Pedir»" />
            </div>

            <section className="rounded-3xl border bg-card p-4 shadow-sm">
              <h2 className="mb-3 font-semibold">Vistas por día</h2>
              <div className="flex h-40 items-end gap-0.5" role="img" aria-label={`Vistas por día, últimos ${DIAS} días`}>
                {datos.vistas.map((v) => (
                  <div key={v.dia} className="group relative flex h-full flex-1 items-end" title={`${corto(v.dia)}: ${v.n} ${v.n === 1 ? 'vista' : 'vistas'}`}>
                    <div className="w-full rounded-t-[4px] bg-grafica transition-opacity group-hover:opacity-80" style={{ height: v.n ? `${Math.max(3, (v.n / max) * 100)}%` : '2px', opacity: v.n ? 1 : 0.25 }} />
                    <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 rounded-lg bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground shadow ring-1 ring-foreground/10 group-hover:block">
                      {corto(v.dia)}: <b>{v.n}</b>
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-1 flex justify-between border-t pt-1 text-xs text-muted-foreground">
                <span>{corto(datos.vistas[0].dia)}</span>
                <span>{corto(datos.vistas[DIAS - 1].dia)}</span>
              </div>
              <details className="mt-2 text-sm">
                <summary className="cursor-pointer text-muted-foreground">Ver tabla</summary>
                <table className="mt-2 w-full text-left">
                  <tbody>
                    {datos.vistas.map((v) => (
                      <tr key={v.dia} className="border-t"><td className="py-1">{corto(v.dia)}</td><td className="py-1 text-right tabular-nums">{v.n}</td></tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>

            <section className="rounded-3xl border bg-card p-4 shadow-sm">
              <h2 className="mb-3 font-semibold">Productos más pedidos</h2>
              {datos.top.length === 0 && <p className="text-sm text-muted-foreground">Todavía nadie ha tocado «Pedir por WhatsApp».</p>}
              <ol className="space-y-3">
                {datos.top.map(([pid, x]) => (
                  <li key={pid}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{nombre(pid)}</span>
                      <span className="tabular-nums">{x.n}</span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-muted">
                      <div className="h-full rounded-full bg-grafica" style={{ width: `${(x.n / maxTop) * 100}%` }} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">{[...x.detalle].map(([k, n]) => `${k} (${n})`).join(', ')}</p>
                  </li>
                ))}
              </ol>
            </section>
          </>
        )}
      </div>
    </Pantalla>
  )
}

function Tile({ titulo, valor, nota }: { titulo: string; valor: number; nota: string }) {
  return (
    <div className="rounded-3xl border bg-card p-4 shadow-sm">
      <p className="text-sm text-muted-foreground">{titulo}</p>
      <p className="font-titulo text-4xl tracking-wide tabular-nums">{valor}</p>
      <p className="text-xs text-muted-foreground">{nota}</p>
    </div>
  )
}
