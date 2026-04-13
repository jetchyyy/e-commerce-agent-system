import { supabase } from '../../lib/supabase'
import {
  resolveStorefrontContent,
  type StorefrontContent,
} from '../../lib/storefront-content'
import { slugify } from '../../lib/utils'
import type { Database } from '../../types/database'

export interface StoreOption {
  id: string
  name: string
  slug: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface AdminAccountRow {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  store_id: string | null
  is_active: boolean
  created_at: string
  stores: {
    name: string
    slug: string
  } | null
}

export interface RegisteredProfileRow {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  role: 'customer' | 'agent' | 'admin' | 'superadmin'
  store_id: string | null
  is_active: boolean
  created_at: string
}

export interface CreateStoreAdminInput {
  fullName: string
  email: string
  password: string
  phone?: string
  storeId: string
  sendInviteEmail?: boolean
}

export interface PromoteProfileToAdminInput {
  profileId: string
  storeId: string
  fullName?: string
  phone?: string
}

export interface CreateStoreInput {
  name: string
  slug?: string
}

export interface StoreBrandingRow {
  store_id: string
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
  receipt_header: string | null
  receipt_footer: string | null
  invoice_notes: string | null
  currency_code: string
  social_links: Record<string, unknown>
  storefront_content: StorefrontContent
  created_at: string
  updated_at: string
}

export interface BrandingUpsertInput {
  storeId: string
  storeName: string
  heroTitle?: string
  heroSubtitle?: string
  primaryColor: string
  accentColor: string
  supportEmail?: string
  supportPhone?: string
  address?: string
  footerText?: string
  receiptHeader?: string
  receiptFooter?: string
  invoiceNotes?: string
  currencyCode: string
  storefrontContent: StorefrontContent
}

export interface AuditLogRow {
  id: string
  store_id: string | null
  actor_profile_id: string | null
  entity_type: string
  entity_id: string | null
  action: string
  details: Record<string, unknown>
  created_at: string
  stores: {
    name: string
    slug: string
  } | null
  actor: {
    full_name: string | null
    email: string | null
  } | null
}

export interface SuperadminOverview {
  totalStores: number
  activeStores: number
  adminAccounts: number
  brandedStores: number
  readyForTurnover: number
}

export async function fetchStores() {
  if (!supabase) {
    return [] as StoreOption[]
  }

  const { data, error } = await supabase
    .from('stores')
    .select('id, name, slug, is_active')
    .order('name')

  if (error) {
    throw error
  }

  return data as StoreOption[]
}

export async function createStore(input: CreateStoreInput) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = supabase as unknown as {
    from: (table: string) => {
      insert: (values: Record<string, unknown>) => {
        select: (query: string) => {
          single: () => Promise<{ data: unknown; error: Error | null }>
        }
      }
    }
  }

  const payload: Database['public']['Tables']['stores']['Insert'] = {
    name: input.name.trim(),
    slug: slugify(input.slug?.trim() || input.name),
    is_active: true,
  }

  const { data, error } = await client
    .from('stores')
    .insert(payload)
    .select('id, name, slug, is_active, created_at, updated_at')
    .single()

  if (error) {
    throw error
  }

  return data as StoreOption
}

export async function fetchAdminAccounts() {
  if (!supabase) {
    return [] as AdminAccountRow[]
  }

  const { data, error } = await supabase
    .from('profiles')
    .select(
      'id, email, full_name, phone, store_id, is_active, created_at, stores:store_id(name, slug)',
    )
    .eq('role', 'admin')
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as AdminAccountRow[]
}

export async function fetchRegisteredProfiles() {
  if (!supabase) {
    return [] as RegisteredProfileRow[]
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, phone, role, store_id, is_active, created_at')
    .in('role', ['customer', 'agent', 'admin'])
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data as RegisteredProfileRow[]
}

export async function createStoreAdmin(input: CreateStoreAdminInput) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session?.access_token) {
    throw new Error(
      'You must be logged in as superadmin before creating an owner/admin account.',
    )
  }

  const payload = {
    fullName: input.fullName,
    email: input.email,
    password: input.password,
    phone: input.phone ?? null,
    storeId: input.storeId,
    sendInviteEmail: input.sendInviteEmail ?? false,
  }

  const invocation = supabase.functions.invoke('create-store-admin', {
    body: payload,
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(
        new Error(
          'The create-store-admin request timed out. Check your deployed Edge Function and function logs.',
        ),
      )
    }, 15000)
  })

  const { data, error } = (await Promise.race([
    invocation,
    timeout,
  ])) as Awaited<typeof invocation>

  if (error) {
    const functionError = data as { error?: string } | null
    throw new Error(
      functionError?.error ||
        error.message ||
        'The create-store-admin function returned a non-2xx status code.',
    )
  }

  return data as {
    userId: string
    email: string
    storeId: string
    role: 'admin'
  }
}

export async function promoteProfileToAdmin(input: PromoteProfileToAdminInput) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = supabase as unknown as {
    from: (table: string) => {
      update: (values: Record<string, unknown>) => {
        eq: (column: string, value: string) => {
          select: (query: string) => {
            single: () => Promise<{ data: unknown; error: Error | null }>
          }
        }
      }
    }
  }

  const { data, error } = await client
    .from('profiles')
    .update({
      role: 'admin',
      store_id: input.storeId,
      full_name: input.fullName?.trim() || undefined,
      phone: input.phone?.trim() || undefined,
      is_active: true,
    })
    .eq('id', input.profileId)
    .select('id, email, full_name, phone, store_id, is_active, created_at')
    .single()

  if (error) {
    throw error
  }

  return data as Omit<AdminAccountRow, 'stores'>
}

export async function fetchBrandingRecords() {
  if (!supabase) {
    return [] as StoreBrandingRow[]
  }

  const { data, error } = await supabase
    .from('store_branding')
    .select(
      'store_id, store_name, logo_url, favicon_url, hero_title, hero_subtitle, primary_color, accent_color, support_email, support_phone, address, footer_text, receipt_header, receipt_footer, invoice_notes, currency_code, social_links, created_at, updated_at',
    )
    .order('updated_at', { ascending: false })

  if (error) {
    throw error
  }

  return ((data ?? []) as Array<Omit<StoreBrandingRow, 'storefront_content'>>).map(
    (row) => ({
      ...row,
      social_links: row.social_links ?? {},
      storefront_content: resolveStorefrontContent(row.social_links),
    }),
  )
}

export async function fetchBrandingByStore(storeId: string) {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('store_branding')
    .select(
      'store_id, store_name, logo_url, favicon_url, hero_title, hero_subtitle, primary_color, accent_color, support_email, support_phone, address, footer_text, receipt_header, receipt_footer, invoice_notes, currency_code, social_links, created_at, updated_at',
    )
    .eq('store_id', storeId)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  const row = data as Omit<StoreBrandingRow, 'storefront_content'>

  return {
    ...row,
    social_links: row.social_links ?? {},
    storefront_content: resolveStorefrontContent(row.social_links),
  }
}

export async function upsertBranding(input: BrandingUpsertInput) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = supabase as unknown as {
    from: (table: string) => {
      upsert: (values: Record<string, unknown>) => {
        select: (query: string) => {
          single: () => Promise<{ data: unknown; error: Error | null }>
        }
      }
    }
  }

  const payload: Database['public']['Tables']['store_branding']['Insert'] = {
    store_id: input.storeId,
    store_name: input.storeName.trim(),
    hero_title: input.heroTitle?.trim() || null,
    hero_subtitle: input.heroSubtitle?.trim() || null,
    primary_color: input.primaryColor,
    accent_color: input.accentColor,
    support_email: input.supportEmail?.trim() || null,
    support_phone: input.supportPhone?.trim() || null,
    address: input.address?.trim() || null,
    footer_text: input.footerText?.trim() || null,
    receipt_header: input.receiptHeader?.trim() || null,
    receipt_footer: input.receiptFooter?.trim() || null,
    invoice_notes: input.invoiceNotes?.trim() || null,
    currency_code: input.currencyCode.trim(),
    social_links: {
      storefrontContent: input.storefrontContent,
    },
  }

  const { data, error } = await client
    .from('store_branding')
    .upsert(payload)
    .select(
      'store_id, store_name, logo_url, favicon_url, hero_title, hero_subtitle, primary_color, accent_color, support_email, support_phone, address, footer_text, receipt_header, receipt_footer, invoice_notes, currency_code, social_links, created_at, updated_at',
    )
    .single()

  if (error) {
    throw error
  }

  const row = data as Omit<StoreBrandingRow, 'storefront_content'>

  return {
    ...row,
    social_links: row.social_links ?? {},
    storefront_content: resolveStorefrontContent(row.social_links),
  }
}

export async function uploadBrandingAsset(input: {
  storeId: string
  file: File
  slot: string
}) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const fileExt = input.file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const sanitizedSlot = slugify(input.slot || 'branding-image')
  const filePath = `${input.storeId}/${sanitizedSlot}-${crypto.randomUUID()}.${fileExt}`

  const { error: uploadError } = await supabase.storage
    .from('branding-assets')
    .upload(filePath, input.file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (uploadError) {
    throw uploadError
  }

  const { data } = supabase.storage.from('branding-assets').getPublicUrl(filePath)

  if (!data.publicUrl) {
    throw new Error('Unable to generate a public URL for the uploaded branding asset.')
  }

  return {
    path: filePath,
    publicUrl: data.publicUrl,
  }
}

export async function fetchAuditLogs(limit = 25) {
  if (!supabase) {
    return [] as AuditLogRow[]
  }

  const { data, error } = await supabase
    .from('audit_logs')
    .select(
      'id, store_id, actor_profile_id, entity_type, entity_id, action, details, created_at, stores:store_id(name, slug), actor:actor_profile_id(full_name, email)',
    )
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    throw error
  }

  return data as AuditLogRow[]
}

export async function fetchSuperadminOverview(): Promise<SuperadminOverview> {
  const [stores, admins, branding] = await Promise.all([
    fetchStores(),
    fetchAdminAccounts(),
    fetchBrandingRecords(),
  ])

  const brandedStoreIds = new Set(branding.map((item) => item.store_id))
  const adminStoreIds = new Set(
    admins.map((item) => item.store_id).filter(Boolean) as string[],
  )

  const readyForTurnover = stores.filter(
    (store) => brandedStoreIds.has(store.id) && adminStoreIds.has(store.id),
  ).length

  return {
    totalStores: stores.length,
    activeStores: stores.filter((store) => store.is_active).length,
    adminAccounts: admins.length,
    brandedStores: brandedStoreIds.size,
    readyForTurnover,
  }
}
