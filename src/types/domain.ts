import type { StorefrontContent } from '../lib/storefront-content'

export type AppRole = 'superadmin' | 'admin' | 'customer' | 'agent'

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'ready_for_pickup'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'

export type CommissionStatus =
  | 'pending'
  | 'approved'
  | 'locked'
  | 'paid'
  | 'cancelled'
  | 'reversed'

export interface Profile {
  id: string
  store_id: string | null
  full_name: string | null
  email: string | null
  role: AppRole
  phone: string | null
  avatar_url: string | null
}

export interface StoreBranding {
  store_name: string
  logo_url: string | null
  favicon_url: string | null
  hero_title: string | null
  hero_subtitle: string | null
  primary_color: string
  accent_color: string
  support_email: string | null
  support_phone: string | null
  address: string | null
  footer_text: string | null
  currency_code: string
  social_links?: Record<string, unknown> | null
  storefront_content?: StorefrontContent
}

export interface Category {
  id: string
  store_id?: string
  name: string
  slug: string
  description: string | null
  is_active?: boolean
  created_at?: string
  updated_at?: string
}

export interface Product {
  id: string
  store_id: string
  name: string
  slug: string
  short_description: string | null
  description: string | null
  sku: string
  category_id: string | null
  price: number
  sale_price: number | null
  is_on_sale: boolean
  sale_starts_at: string | null
  sale_ends_at: string | null
  stock_quantity: number
  is_available: boolean
  track_inventory: boolean
  image_urls: string[]
  is_featured: boolean
  created_at: string
  updated_at: string
  archived_at: string | null
}

export interface OrderSummary {
  id: string
  store_id: string
  customer_id: string | null
  order_number: string
  source: 'online' | 'pos'
  status: OrderStatus
  subtotal_amount: number
  discount_amount: number
  total_amount: number
  payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded'
  placed_at: string
}

export interface AgentSummary {
  id: string
  profile_id: string
  store_id: string
  referral_code: string
  full_name: string
  email: string
  commission_type: 'fixed' | 'percentage'
  commission_value: number
  is_active: boolean
}

export interface DashboardStat {
  label: string
  value: string
  helper: string
}
