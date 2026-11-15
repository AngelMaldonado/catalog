import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useLocation, useParams } from 'react-router'
import { ImagePlus, Shirt } from 'lucide-react'
import { pb } from '../lib/pb'
import type { Catalog, Product, ProductRender } from '../lib/types'
import { dinero, useTokenArchivos } from '../lib/datos'
import { useNegocio } from '../lib/negocio'
import { marcarDireccion } from '../lib/transicion'
import { Pantalla } from '../components/shell/Pantalla'
import { Encabezado } from '../components/shell/Encabezado'
import { Vacio } from '../components/shell/Lista'
import { Button } from '../components/ui/button'
import { NuevosProductos } from './NuevosProductos'

export function CatalogDetailPage() {
  const { id = '' } = useParams()
  const { pathname } = useLocation()
  const [hoja, setHoja] = useState(false)
  const { data: negocio } = useNegocio()
  const { data: token } = useTokenArchivos()
  const catalogo = useQuery({ queryKey: ['catalog', id], queryFn: () => pb.collection('catalogs').getOne<Catalog>(id, { expand: 'theme' }) })
  const productos = useQuery({
    queryKey: ['products', id],
    queryFn: async () => {
      const [ps, rs] = await Promise.all([
        pb.collection('products').getFullList<Product>({ filter: pb.filter('catalog = {:c}', { c: id }), sort: 'sort', expand: 'template' }),
        pb.collection('product_renders').getFullList<ProductRender>({ filter: pb.filter('product.catalog = {:c}', { c: id }) }),
      ])
      return ps.map((p) => ({ producto: p, render: rs.find((r) => r.product === p.id && r.color === p.colors[0]) ?? rs.find((r) => r.product === p.id) }))
    },
  })

  return (
    <Pantalla encabezado={<Encabezado titulo={catalogo.data?.name ?? 'Catálogo'} atras="/admin" />}>
      {productos.isPending && <p className="p-6 text-muted-foreground">Cargando…</p>}
      {productos.data?.length === 0 && (
        <Vacio icono={Shirt} titulo="Sin productos" texto="Suelta tus diseños y se generan los mockups de cada prenda en los colores que elijas.">
          <Button onClick={() => setHoja(true)}>
            <ImagePlus /> Agregar diseños
          </Button>
        </Vacio>
      )}
      {!!productos.data?.length && (
        <div className="mx-3 mt-3 mb-6 space-y-3 sm:mx-auto sm:w-full sm:max-w-3xl">
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {productos.data.map(({ producto, render }) => {
              const to = `/admin/catalogos/${id}/productos/${producto.id}`
              return (
                <li key={producto.id}>
                  <Link to={to} viewTransition onClick={() => marcarDireccion(pathname, to)} className="block overflow-hidden rounded-3xl border bg-card shadow-sm active:bg-muted">
                    <div className="aspect-square bg-muted/60">
                      {render && token && <img src={pb.files.getURL(render, render.img_480, { token })} alt="" className="size-full object-contain" loading="lazy" />}
                    </div>
                    <div className="p-3">
                      <p className="truncate text-sm font-semibold">{producto.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dinero(producto.price, negocio?.currency)} · {producto.colors.length} {producto.colors.length === 1 ? 'color' : 'colores'}
                      </p>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
          <Button variant="outline" className="w-full" onClick={() => setHoja(true)}>
            <ImagePlus /> Agregar diseños
          </Button>
        </div>
      )}
      {catalogo.data && <NuevosProductos catalogo={catalogo.data} abierta={hoja} onClose={() => setHoja(false)} />}
    </Pantalla>
  )
}
