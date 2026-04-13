import { supabase } from '../../lib/supabase'
import type { CommissionStatus, OrderStatus, Product, Profile } from '../../types/domain'

export interface OrderListRow {
  id: string
  store_id: string
  customer_id: string | null
  order_number: string
  source: 'online' | 'pos'
  status: OrderStatus
  payment_status: 'pending' | 'paid' | 'cancelled' | 'refunded'
  subtotal_amount: number
  discount_amount: number
  total_amount: number
  notes: string | null
  placed_at: string
  created_at: string
  updated_at: string
  customer: Pick<Profile, 'id' | 'full_name' | 'email' | 'phone'> | null
}

export interface OrderItemRow {
  id: string
  order_id: string
  product_id: string
  sku: string
  product_name: string
  quantity: number
  unit_price: number
  discount_amount: number
  line_total: number
  created_at: string
}

export interface OrderReferralRow {
  id: string
  order_id: string
  agent_id: string
  referral_code_used: string
  attribution_source: string
  created_at: string
}

export interface CommissionRow {
  id: string
  store_id: string
  agent_id: string
  order_id: string
  commission_type: 'fixed' | 'percentage'
  commission_rate_or_value: number
  commission_amount: number
  status: CommissionStatus
  payout_id: string | null
  approved_at: string | null
  paid_at: string | null
  created_at: string
  updated_at: string
}

export interface PosTransactionRow {
  id: string
  store_id: string
  order_id: string
  cashier_id: string
  customer_id: string | null
  receipt_number: string
  cash_received: number
  change_due: number
  notes: string | null
  created_at: string
}

export interface InventoryMovementRow {
  id: string
  store_id: string
  product_id: string
  order_id: string | null
  quantity_delta: number
  reason:
    | 'online_sale'
    | 'pos_sale'
    | 'manual_adjustment'
    | 'refund'
    | 'restock'
    | 'correction'
  notes: string | null
  created_by: string | null
  created_at: string
  product: {
    id: string
    name: string
    sku: string
    stock_quantity: number
    low_stock_threshold: number
  } | null
}

export interface AdminDashboardSnapshot {
  totalSales: number
  totalOrders: number
  totalOnlineSales: number
  totalPosSales: number
  pendingOrders: number
  lowStockItems: number
  outstandingCommission: number
  paidCommission: number
  recentOrders: OrderListRow[]
}

export interface AnalyticsSnapshot {
  revenuePoints: Array<{
    label: string
    revenue: number
    orders: number
  }>
  topProducts: Array<{
    productName: string
    quantitySold: number
    revenue: number
  }>
  statusBreakdown: Array<{
    status: OrderStatus
    count: number
  }>
  totalRevenue: number
  totalOrders: number
  averageOrderValue: number
}

function ensureSupabase() {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  return supabase
}

function getWriteClient() {
  const client = ensureSupabase()

  return client as unknown as {
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
}

export async function fetchProductBySlug(slug: string) {
  const client = ensureSupabase()

  const { data, error } = await client
    .from('products')
    .select(
      'id, store_id, name, slug, short_description, description, sku, category_id, price, sale_price, is_on_sale, sale_starts_at, sale_ends_at, stock_quantity, low_stock_threshold, is_available, track_inventory, image_urls, is_featured, created_at, updated_at, archived_at',
    )
    .eq('slug', slug)
    .is('archived_at', null)
    .maybeSingle()

  if (error) {
    throw error
  }

  return (data ?? null) as (Product & { low_stock_threshold: number }) | null
}

export async function fetchOrdersByStore(storeId: string) {
  const client = ensureSupabase()

  const { data, error } = await client
    .from('orders')
    .select(
      'id, store_id, customer_id, order_number, source, status, payment_status, subtotal_amount, discount_amount, total_amount, notes, placed_at, created_at, updated_at, customer:customer_id(id, full_name, email, phone)',
    )
    .eq('store_id', storeId)
    .order('placed_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as OrderListRow[]
}

export async function fetchOrderById(orderId: string) {
  const client = ensureSupabase()

  const [{ data: order, error: orderError }, { data: items, error: itemsError }, { data: referral, error: referralError }, { data: commissions, error: commissionsError }, { data: posTransaction, error: posError }] = await Promise.all([
    client
      .from('orders')
      .select(
        'id, store_id, customer_id, order_number, source, status, payment_status, subtotal_amount, discount_amount, total_amount, notes, placed_at, created_at, updated_at, customer:customer_id(id, full_name, email, phone)',
      )
      .eq('id', orderId)
      .maybeSingle(),
    client
      .from('order_items')
      .select(
        'id, order_id, product_id, sku, product_name, quantity, unit_price, discount_amount, line_total, created_at',
      )
      .eq('order_id', orderId)
      .order('created_at'),
    client
      .from('order_referrals')
      .select('id, order_id, agent_id, referral_code_used, attribution_source, created_at')
      .eq('order_id', orderId)
      .maybeSingle(),
    client
      .from('commissions')
      .select(
        'id, store_id, agent_id, order_id, commission_type, commission_rate_or_value, commission_amount, status, payout_id, approved_at, paid_at, created_at, updated_at',
      )
      .eq('order_id', orderId)
      .order('created_at'),
    client
      .from('pos_transactions')
      .select(
        'id, store_id, order_id, cashier_id, customer_id, receipt_number, cash_received, change_due, notes, created_at',
      )
      .eq('order_id', orderId)
      .maybeSingle(),
  ])

  if (orderError) throw orderError
  if (itemsError) throw itemsError
  if (referralError) throw referralError
  if (commissionsError) throw commissionsError
  if (posError) throw posError

  return {
    order: (order ?? null) as OrderListRow | null,
    items: (items ?? []) as OrderItemRow[],
    referral: (referral ?? null) as OrderReferralRow | null,
    commissions: (commissions ?? []) as CommissionRow[],
    posTransaction: (posTransaction ?? null) as PosTransactionRow | null,
  }
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const client = getWriteClient()
  const { data, error } = await client
    .from('orders')
    .update({ status })
    .eq('id', orderId)
    .select(
      'id, store_id, customer_id, order_number, source, status, payment_status, subtotal_amount, discount_amount, total_amount, notes, placed_at, created_at, updated_at',
    )
    .single()

  if (error) {
    throw error
  }

  return data as OrderListRow
}

export async function fetchInventorySnapshot(storeId: string) {
  const client = ensureSupabase()

  const [{ data: products, error: productsError }, { data: movements, error: movementsError }] = await Promise.all([
    client
      .from('products')
      .select(
        'id, store_id, name, slug, short_description, description, sku, category_id, price, sale_price, is_on_sale, sale_starts_at, sale_ends_at, stock_quantity, low_stock_threshold, is_available, track_inventory, image_urls, is_featured, created_at, updated_at, archived_at',
      )
      .eq('store_id', storeId)
      .order('updated_at', { ascending: false }),
    client
      .from('inventory_movements')
      .select(
        'id, store_id, product_id, order_id, quantity_delta, reason, notes, created_by, created_at, product:product_id(id, name, sku, stock_quantity, low_stock_threshold)',
      )
      .eq('store_id', storeId)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (productsError) throw productsError
  if (movementsError) throw movementsError

  return {
    products: ((products ?? []) as Array<Product & { low_stock_threshold: number }>),
    movements: (movements ?? []) as InventoryMovementRow[],
  }
}

export async function fetchAdminDashboardSnapshot(storeId: string): Promise<AdminDashboardSnapshot> {
  const client = ensureSupabase()

  const [{ data: orders, error: ordersError }, { data: products, error: productsError }, { data: commissions, error: commissionsError }] = await Promise.all([
    client
      .from('orders')
      .select(
        'id, store_id, customer_id, order_number, source, status, payment_status, subtotal_amount, discount_amount, total_amount, notes, placed_at, created_at, updated_at, customer:customer_id(id, full_name, email, phone)',
      )
      .eq('store_id', storeId)
      .order('placed_at', { ascending: false }),
    client
      .from('products')
      .select(
        'id, store_id, name, slug, short_description, description, sku, category_id, price, sale_price, is_on_sale, sale_starts_at, sale_ends_at, stock_quantity, low_stock_threshold, is_available, track_inventory, image_urls, is_featured, created_at, updated_at, archived_at',
      )
      .eq('store_id', storeId),
    client
      .from('commissions')
      .select(
        'id, store_id, agent_id, order_id, commission_type, commission_rate_or_value, commission_amount, status, payout_id, approved_at, paid_at, created_at, updated_at',
      )
      .eq('store_id', storeId),
  ])

  if (ordersError) throw ordersError
  if (productsError) throw productsError
  if (commissionsError) throw commissionsError

  const orderRows = (orders ?? []) as OrderListRow[]
  const productRows = (products ?? []) as Array<Product & { low_stock_threshold: number }>
  const commissionRows = (commissions ?? []) as CommissionRow[]

  return {
    totalSales: orderRows
      .filter((order) => order.payment_status === 'paid' || order.status === 'completed')
      .reduce((sum, order) => sum + order.total_amount, 0),
    totalOrders: orderRows.length,
    totalOnlineSales: orderRows
      .filter((order) => order.source === 'online')
      .reduce((sum, order) => sum + order.total_amount, 0),
    totalPosSales: orderRows
      .filter((order) => order.source === 'pos')
      .reduce((sum, order) => sum + order.total_amount, 0),
    pendingOrders: orderRows.filter((order) =>
      ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'out_for_delivery'].includes(order.status),
    ).length,
    lowStockItems: productRows.filter(
      (product) =>
        product.track_inventory &&
        !product.archived_at &&
        product.stock_quantity <= product.low_stock_threshold,
    ).length,
    outstandingCommission: commissionRows
      .filter((commission) => ['approved', 'locked'].includes(commission.status) && !commission.payout_id)
      .reduce((sum, commission) => sum + commission.commission_amount, 0),
    paidCommission: commissionRows
      .filter((commission) => commission.status === 'paid')
      .reduce((sum, commission) => sum + commission.commission_amount, 0),
    recentOrders: orderRows.slice(0, 6),
  }
}

export async function fetchAnalyticsSnapshot(storeId: string): Promise<AnalyticsSnapshot> {
  const client = ensureSupabase()

  const [{ data: orders, error: ordersError }, { data: orderItems, error: itemsError }] = await Promise.all([
    client
      .from('orders')
      .select('id, status, source, total_amount, placed_at')
      .eq('store_id', storeId)
      .order('placed_at', { ascending: true }),
    client
      .from('order_items')
      .select('id, order_id, product_name, quantity, line_total, created_at'),
  ])

  if (ordersError) throw ordersError
  if (itemsError) throw itemsError

  const orderRows = (orders ?? []) as Array<{
    id: string
    status: OrderStatus
    source: 'online' | 'pos'
    total_amount: number
    placed_at: string
  }>
  const itemRows = (orderItems ?? []) as Array<{
    id: string
    order_id: string
    product_name: string
    quantity: number
    line_total: number
    created_at: string
  }>

  const orderIds = new Set(orderRows.map((order) => order.id))
  const scopedItems = itemRows.filter((item) => orderIds.has(item.order_id))

  const revenueMap = new Map<string, { revenue: number; orders: number }>()
  for (const order of orderRows) {
    const label = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
    }).format(new Date(order.placed_at))
    const current = revenueMap.get(label) ?? { revenue: 0, orders: 0 }
    current.revenue += order.total_amount
    current.orders += 1
    revenueMap.set(label, current)
  }

  const productMap = new Map<string, { productName: string; quantitySold: number; revenue: number }>()
  for (const item of scopedItems) {
    const current = productMap.get(item.product_name) ?? {
      productName: item.product_name,
      quantitySold: 0,
      revenue: 0,
    }
    current.quantitySold += item.quantity
    current.revenue += item.line_total
    productMap.set(item.product_name, current)
  }

  const statusMap = new Map<OrderStatus, number>()
  for (const order of orderRows) {
    statusMap.set(order.status, (statusMap.get(order.status) ?? 0) + 1)
  }

  const totalRevenue = orderRows.reduce((sum, order) => sum + order.total_amount, 0)
  const totalOrders = orderRows.length

  return {
    revenuePoints: Array.from(revenueMap.entries()).map(([label, value]) => ({
      label,
      revenue: value.revenue,
      orders: value.orders,
    })),
    topProducts: Array.from(productMap.values())
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, 5),
    statusBreakdown: Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    })),
    totalRevenue,
    totalOrders,
    averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
  }
}

export async function fetchCustomerOrders(customerId: string) {
  const client = ensureSupabase()

  const { data, error } = await client
    .from('orders')
    .select(
      'id, store_id, customer_id, order_number, source, status, payment_status, subtotal_amount, discount_amount, total_amount, notes, placed_at, created_at, updated_at',
    )
    .eq('customer_id', customerId)
    .order('placed_at', { ascending: false })

  if (error) {
    throw error
  }

  return (data ?? []) as OrderListRow[]
}

export async function updateOwnProfile(profileId: string, values: {
  fullName: string
  phone?: string
}) {
  const client = getWriteClient()
  const { data, error } = await client
    .from('profiles')
    .update({
      full_name: values.fullName.trim(),
      phone: values.phone?.trim() || null,
    })
    .eq('id', profileId)
    .select('id, store_id, full_name, email, role, phone, avatar_url')
    .single()

  if (error) {
    throw error
  }

  return data as Profile
}
