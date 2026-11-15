// Shapes of the PocketBase collections (see pb/pb_migrations/1794768000_schema.js).
import type { RecordModel } from 'pocketbase'

export type PageTurn = 'rigid' | 'realistic'

export interface Category extends RecordModel {
  name: string
  sort: number
}

export interface Theme extends RecordModel {
  name: string
  slug: string
  season: string
}

export interface Catalog extends RecordModel {
  name: string
  slug: string
  status: 'draft' | 'published'
  theme: string
  page_turn: PageTurn
  layout: '1' | '2' | '4'
  category_order: string[] | null
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
