import type { DisenoOg, DisenoPortada } from '../catalogo/lienzo'
import type { Realce } from '../catalogo/pintar'
// Shapes of the PocketBase collections (see pb/pb_migrations/1794768000_schema.js).
import type { RecordModel } from 'pocketbase'

export type PageTurn = 'rigid' | 'realistic'

export interface Category extends RecordModel {
  name: string
  sort: number
}

export interface GarmentColor {
  name: string
  hex: string
}

export interface GarmentTemplate extends RecordModel {
  name: string
  kind: 'tshirt' | 'hoodie' | 'crewneck' | 'cap'
  base: string
  mask: string
  shadow: string
  print_area: [[number, number], [number, number], [number, number], [number, number]]
  colors: GarmentColor[]
  sizes: string[]
  base_price: number
  category_name: string
  sort: number
  /** plantilla principal de la que ésta es variante (vacío: es principal) */
  variant_of: string
  /** cómo la ve el cliente («Con gorro», «Sin gorro») */
  variant_name: string
}

export interface Design extends RecordModel {
  catalog: string
  name: string
  file: string
  width: number
  height: number
}

export interface Product extends RecordModel {
  catalog: string
  design: string
  template: string
  category: string
  name: string
  price: number
  placement: { x: number; y: number; scale: number; rotation: number }
  colors: string[]
  sizes: string[]
  sort: number
  /** plantillas que se ofrecen (principal + variantes); vacío = sólo `template` */
  variants: string[]
  expand?: { template?: GarmentTemplate; design?: Design; category?: Category; variants?: GarmentTemplate[] }
}

export interface ProductRender extends RecordModel {
  product: string
  color: string
  /** variante que muestra (vacío = la plantilla del producto) */
  template: string
  img_480: string
  img_960: string
}

export type FondoPagina = 'cover' | 'divider' | 'products' | 'promo' | 'back' | 'filler'
export const FONDOS: FondoPagina[] = ['cover', 'divider', 'products', 'promo', 'back', 'filler']

export interface Theme extends RecordModel {
  name: string
  slug: string
  season: string
  palette: { background: string; ink: string; accent: string }
  /** fuente: id de lib/fuentes.ts para el título de los catálogos de este tema que no elijan otra */
  fonts: { title: string; body: string; fuente?: string }
  bg_cover: string
  bg_divider: string
  bg_products: string
  bg_promo: string
  bg_back: string
  bg_filler: string
  sort: number
}

export interface SpecialPage extends RecordModel {
  catalog: string
  kind: 'promo' | 'image'
  title: string
  body: string
  image: string
  position: number
}

export interface Catalog extends RecordModel {
  name: string
  slug: string
  status: 'draft' | 'published'
  theme: string
  page_turn: PageTurn
  layout: '1' | '2' | '4'
  category_order: string[] | null
  bg_cover: string
  bg_divider: string
  bg_products: string
  bg_promo: string
  bg_back: string
  bg_filler: string
  og_image: string
  /** portada con elementos movibles (catalogo/lienzo.ts); null = la clásica */
  cover_layout: DisenoPortada | null
  /** contraportada con elementos movibles; null = la clásica */
  back_layout: DisenoPortada | null
  /** composición de la imagen para redes; null = la plantilla por defecto */
  og_layout: DisenoOg | null
  /** fuente del título (lib/fuentes.ts); vacío = la del tema */
  title_font: string
  /** realce detrás de cada producto; vacío = brillo */
  product_highlight: Realce | ''
  expand?: { theme?: Theme }
}

export interface Settings extends RecordModel {
  business_name: string
  logo: string
  whatsapp: string
  instagram: string
  facebook: string
  tiktok: string
  address: string
  currency: string
  current_catalog: string
  expand?: { current_catalog?: Catalog }
}
