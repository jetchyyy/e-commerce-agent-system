import { supabase } from '../../lib/supabase'
import { useReferralStore } from '../../stores/referral-store'

interface CheckoutItemInput {
  product_id: string
  quantity: number
}

interface CheckoutOrderResult {
  order_id: string
  order_number: string
  total_amount: number
}

interface PosSaleResult {
  pos_transaction_id: string
  order_id: string
  receipt_number: string
}

export async function checkoutOrder(input: {
  storeId: string
  customerId: string | null
  items: CheckoutItemInput[]
  idempotencyKey: string
  notes?: string
}) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown[] | null; error: Error | null }>
  }

  const referralCode = useReferralStore.getState().referralCode

  const { data, error } = await client.rpc('checkout_order_atomic', {
    p_store_id: input.storeId,
    p_customer_id: input.customerId,
    p_items: input.items,
    p_idempotency_key: input.idempotencyKey,
    p_referral_code: referralCode,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throw error
  }

  return (data?.[0] ?? null) as CheckoutOrderResult | null
}

export async function completePosSale(input: {
  storeId: string
  cashierId: string
  customerId?: string | null
  items: CheckoutItemInput[]
  cashReceived: number
  idempotencyKey: string
  notes?: string
}) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const client = supabase as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown[] | null; error: Error | null }>
  }

  const { data, error } = await client.rpc('complete_pos_sale_atomic', {
    p_store_id: input.storeId,
    p_cashier_id: input.cashierId,
    p_customer_id: input.customerId ?? null,
    p_items: input.items,
    p_cash_received: input.cashReceived,
    p_idempotency_key: input.idempotencyKey,
    p_notes: input.notes ?? null,
  })

  if (error) {
    throw error
  }

  return (data?.[0] ?? null) as PosSaleResult | null
}
