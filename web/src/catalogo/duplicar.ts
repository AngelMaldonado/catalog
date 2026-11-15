// Duplicar un catálogo para la temporada siguiente (decidido: productos por catálogo + duplicar).
// Se hace en el navegador: copia el catálogo (en borrador), sus diseños, productos, renders y
// páginas especiales, bajando y volviendo a subir los archivos (los protegidos, con token).
import { pb } from '../lib/pb'
import { FONDOS, type Catalog, type Design, type Product, type ProductRender, type SpecialPage } from '../lib/types'

type ConArchivo = { id: string; collectionId: string }
async function bajar(rec: ConArchivo, nombre: string, token: string): Promise<File | null> {
  if (!nombre) return null
  const r = await fetch(pb.files.getURL(rec, nombre, { token }))
  if (!r.ok) throw new Error(`No se pudo copiar ${nombre}`)
  const b = await r.blob()
  return new File([b], nombre.replace(/_[a-z0-9]{10}(\.[^.]+)$/i, '$1'), { type: b.type })
}

async function slugLibre(base: string): Promise<string> {
  for (let n = 1; n < 50; n++) {
    const slug = `${base}-copia${n > 1 ? `-${n}` : ''}`.slice(0, 60)
    const hay = await pb.collection('catalogs').getList(1, 1, { filter: pb.filter('slug = {:s}', { s: slug }) })
    if (!hay.totalItems) return slug
  }
  throw new Error('No hay slug libre')
}

export async function duplicarCatalogo(origen: Catalog, onAvance: (texto: string) => void): Promise<Catalog> {
  const token = await pb.files.getToken()
  const filtro = pb.filter('catalog = {:c}', { c: origen.id })
  const [disenos, productos, renders, paginas] = await Promise.all([
    pb.collection('designs').getFullList<Design>({ filter: filtro }),
    pb.collection('products').getFullList<Product>({ filter: filtro }),
    pb.collection('product_renders').getFullList<ProductRender>({ filter: pb.filter('product.catalog = {:c}', { c: origen.id }) }),
    pb.collection('pages').getFullList<SpecialPage>({ filter: filtro }),
  ])
  onAvance('Copiando el catálogo…')
  const fd = new FormData()
  fd.append('name', `${origen.name} (copia)`.slice(0, 80))
  fd.append('slug', await slugLibre(origen.slug))
  fd.append('status', 'draft')
  fd.append('theme', origen.theme)
  fd.append('page_turn', origen.page_turn)
  fd.append('layout', origen.layout)
  fd.append('category_order', JSON.stringify(origen.category_order ?? []))
  for (const f of FONDOS) {
    const a = await bajar(origen, origen[`bg_${f}`], token)
    if (a) fd.append(`bg_${f}`, a)
  }
  const copia = await pb.collection('catalogs').create<Catalog>(fd)

  const mapaDisenos = new Map<string, string>()
  for (const [i, d] of disenos.entries()) {
    onAvance(`Diseños ${i + 1}/${disenos.length}`)
    const f = new FormData()
    f.append('catalog', copia.id)
    f.append('name', d.name)
    f.append('width', String(d.width))
    f.append('height', String(d.height))
    f.append('file', (await bajar(d, d.file, token))!)
    mapaDisenos.set(d.id, (await pb.collection('designs').create(f)).id)
  }
  for (const [i, p] of productos.entries()) {
    onAvance(`Productos ${i + 1}/${productos.length}`)
    const nuevo = await pb.collection('products').create({
      catalog: copia.id, design: mapaDisenos.get(p.design), template: p.template, category: p.category, name: p.name,
      price: p.price, placement: p.placement, colors: p.colors, sizes: p.sizes, sort: p.sort,
    })
    for (const r of renders.filter((x) => x.product === p.id)) {
      const f = new FormData()
      f.append('product', nuevo.id)
      f.append('color', r.color)
      f.append('img_480', (await bajar(r, r.img_480, token))!)
      f.append('img_960', (await bajar(r, r.img_960, token))!)
      await pb.collection('product_renders').create(f)
    }
  }
  for (const pg of paginas) {
    const f = new FormData()
    f.append('catalog', copia.id)
    f.append('kind', pg.kind)
    f.append('title', pg.title)
    f.append('body', pg.body)
    f.append('position', String(pg.position))
    const img = await bajar(pg, pg.image, token)
    if (img) f.append('image', img)
    await pb.collection('pages').create(f)
  }
  return copia
}
