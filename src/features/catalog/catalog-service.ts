import { supabase } from '../../lib/supabase'
import { resolveStorefrontContent } from '../../lib/storefront-content'
import type { Category, Product, StoreBranding } from '../../types/domain'

export async function fetchBranding() {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('store_branding')
    .select(
      'store_name, logo_url, favicon_url, hero_title, hero_subtitle, primary_color, accent_color, support_email, support_phone, address, footer_text, currency_code, social_links',
    )
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return {
    ...(data as StoreBranding),
    storefront_content: resolveStorefrontContent(
      (data as StoreBranding).social_links,
    ),
  } as StoreBranding
}

export async function fetchCategories() {
  if (!supabase) {
    return [] as Category[]
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description')
    .eq('is_active', true)
    .order('name')

  if (error) {
    throw error
  }

  return data as Category[]
}

export async function fetchProducts() {
  if (!supabase) {
    return [] as Product[]
  }

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, store_id, name, slug, short_description, description, sku, category_id, price, sale_price, is_on_sale, sale_starts_at, sale_ends_at, stock_quantity, is_available, track_inventory, image_urls, is_featured, created_at, updated_at, archived_at',
    )
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as Product[]
}
