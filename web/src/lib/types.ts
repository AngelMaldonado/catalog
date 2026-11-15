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
  kind: 'tshirt' | 'hoodie' | 'cap'
  base: string
  mask: string
  shadow: string
  print_area: [[number, number], [number, number], [number, number], [number, number]]
  colors: GarmentColor[]
  sizes: string[]
  base_price: number
  category_name: string
  sort: number
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
  expand?: { template?: GarmentTemplate; design?: Design; category?: Category }
}

export interface ProductRender extends RecordModel {
  product: string
  color: string
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
  fonts: { title: string; body: string }
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
