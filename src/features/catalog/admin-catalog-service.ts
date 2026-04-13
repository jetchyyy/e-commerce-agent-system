import { supabase } from '../../lib/supabase'
import { slugify } from '../../lib/utils'
import type { Category, Product } from '../../types/domain'

export interface CategoryInput {
  storeId: string
  name: string
  slug?: string
  description?: string
  isActive?: boolean
}

export interface ProductInput {
  storeId: string
  name: string
  slug?: string
  shortDescription?: string
  description?: string
  sku: string
  categoryId?: string | null
  price: number
  salePrice?: number | null
  isOnSale?: boolean
  stockQuantity: number
  isAvailable?: boolean
  trackInventory?: boolean
  isFeatured?: boolean
  imageUrls?: string[]
}

function getWriteClient() {
  return supabase as unknown as {
    from: (table: string) => {
      select: (query: string) => {
        eq: (column: string, value: string) => {
          order: (
            column: string,
            options?: { ascending?: boolean },
          ) => Promise<{ data: unknown; error: Error | null }>
        }
      }
      insert: (values: Record<string, unknown>) => {
        select: (query: string) => {
          single: () => Promise<{ data: unknown; error: Error | null }>
        }
      }
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          select: (query: string) => {
            single: () => Promise<{ data: unknown; error: Error | null }>
          }
        }
      }
    }
  }
}

export async function fetchAdminCategories(storeId: string) {
  if (!supabase) {
    return [] as Category[]
  }

  const { data, error } = await supabase
    .from('categories')
    .select('id, store_id, name, slug, description, is_active, created_at, updated_at')
    .eq('store_id', storeId)
    .order('name')

  if (error) {
    throw error
  }

  return data as Category[]
}

export async function createCategory(input: CategoryInput) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = getWriteClient()
  const payload = {
    store_id: input.storeId,
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    description: input.description?.trim() || null,
    is_active: input.isActive ?? true,
  }

  const { data, error } = await client
    .from('categories')
    .insert(payload)
    .select('id, store_id, name, slug, description, is_active, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data as Category
}

export async function updateCategory(categoryId: string, input: CategoryInput) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = getWriteClient()
  const payload = {
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    description: input.description?.trim() || null,
    is_active: input.isActive ?? true,
  }

  const { data, error } = await client
    .from('categories')
    .update(payload)
    .eq('id', categoryId)
    .select('id, store_id, name, slug, description, is_active, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data as Category
}

export async function fetchAdminProducts(storeId: string) {
  if (!supabase) {
    return [] as Product[]
  }

  const { data, error } = await supabase
    .from('products')
    .select(
      'id, store_id, name, slug, short_description, description, sku, category_id, price, sale_price, is_on_sale, sale_starts_at, sale_ends_at, stock_quantity, is_available, track_inventory, image_urls, is_featured, created_at, updated_at, archived_at',
    )
    .eq('store_id', storeId)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as Product[]
}

export async function createProduct(input: ProductInput) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = getWriteClient()
  const payload = {
    store_id: input.storeId,
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    short_description: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    sku: input.sku.trim(),
    category_id: input.categoryId || null,
    price: input.price,
    sale_price: input.salePrice ?? null,
    is_on_sale: input.isOnSale ?? false,
    stock_quantity: input.stockQuantity,
    is_available: input.isAvailable ?? true,
    track_inventory: input.trackInventory ?? true,
    is_featured: input.isFeatured ?? false,
    image_urls: (input.imageUrls ?? []).slice(0, 4),
  }

  const { data, error } = await client
    .from('products')
    .insert(payload)
    .select(
      'id, store_id, name, slug, short_description, description, sku, category_id, price, sale_price, is_on_sale, sale_starts_at, sale_ends_at, stock_quantity, is_available, track_inventory, image_urls, is_featured, created_at, updated_at, archived_at',
    )
    .single()

  if (error) {
    throw error
  }

  return data as Product
}

export async function updateProduct(productId: string, input: ProductInput) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = getWriteClient()
  const payload = {
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    short_description: input.shortDescription?.trim() || null,
    description: input.description?.trim() || null,
    sku: input.sku.trim(),
    category_id: input.categoryId || null,
    price: input.price,
    sale_price: input.salePrice ?? null,
    is_on_sale: input.isOnSale ?? false,
    stock_quantity: input.stockQuantity,
    is_available: input.isAvailable ?? true,
    track_inventory: input.trackInventory ?? true,
    is_featured: input.isFeatured ?? false,
    image_urls: (input.imageUrls ?? []).slice(0, 4),
    archived_at: null,
  }

  const { data, error } = await client
    .from('products')
    .update(payload)
    .eq('id', productId)
    .select(
      'id, store_id, name, slug, short_description, description, sku, category_id, price, sale_price, is_on_sale, sale_starts_at, sale_ends_at, stock_quantity, is_available, track_inventory, image_urls, is_featured, created_at, updated_at, archived_at',
    )
    .single()

  if (error) {
    throw error
  }

  return data as Product
}

export async function archiveProduct(productId: string) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = getWriteClient()
  const { data, error } = await client
    .from('products')
    .update({
      archived_at: new Date().toISOString(),
      is_available: false,
    })
    .eq('id', productId)
    .select(
      'id, store_id, name, slug, short_description, description, sku, category_id, price, sale_price, is_on_sale, sale_starts_at, sale_ends_at, stock_quantity, is_available, track_inventory, image_urls, is_featured, created_at, updated_at, archived_at',
    )
    .single()

  if (error) {
    throw error
  }

  return data as Product
}

export async function uploadProductAsset(input: {
  storeId: string
  file: File
  slot: number
}) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const fileExt = input.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const filePath = `${input.storeId}/product-${input.slot + 1}-${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('product-assets')
    .upload(filePath, input.file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from('product-assets').getPublicUrl(filePath)

  if (!data.publicUrl) {
    throw new Error('Unable to generate a public URL for the uploaded product image.')
  }

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  }
}
