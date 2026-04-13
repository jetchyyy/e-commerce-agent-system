import { supabase } from '../../lib/supabase'
import { slugify } from '../../lib/utils'
import type { CommissionStatus } from '../../types/domain'

export interface AgentAdminRow {
  id: string
  store_id: string
  profile_id: string
  referral_code: string
  commission_type: 'fixed' | 'percentage'
  commission_value: number
  is_active: boolean
  created_at: string
  updated_at: string
  profile: {
    id: string
    full_name: string | null
    email: string | null
    phone: string | null
  } | null
}

export interface AgentLinkRow {
  id: string
  store_id: string
  agent_id: string
  code: string
  target_type: string | null
  target_product_id: string | null
  is_active: boolean
  created_at: string
}

export interface AgentCommissionRow {
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

export interface AgentPayoutRow {
  id: string
  store_id: string
  agent_id: string
  payout_reference: string
  total_amount: number
  payout_method: string
  payout_notes: string | null
  processed_by: string
  processed_at: string
  idempotency_key: string
  created_at: string
}

export interface AgentReferralRow {
  id: string
  store_id: string
  order_id: string
  agent_id: string
  referral_code_used: string
  attribution_source: string
  created_at: string
}

export interface AgentWorkspace {
  agents: AgentAdminRow[]
  links: AgentLinkRow[]
  commissions: AgentCommissionRow[]
  payouts: AgentPayoutRow[]
  referrals: AgentReferralRow[]
}

interface ProcessPayoutResult {
  payout_id: string
  payout_reference: string
  total_amount: number
}

export interface CreateAgentInput {
  fullName: string
  email: string
  password: string
  phone?: string
  storeId: string
  referralCode?: string
  commissionType: 'fixed' | 'percentage'
  commissionValue: number
}

export interface UpdateAgentInput {
  fullName: string
  phone?: string
  referralCode?: string
  commissionType: 'fixed' | 'percentage'
  commissionValue: number
  isActive: boolean
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
      insert: (values: Record<string, unknown>) => {
        select: (query: string) => {
          single: () => Promise<{ data: unknown; error: Error | null }>
        }
      }
    }
  }
}

export async function createAgentAccount(input: CreateAgentInput) {
  const client = ensureSupabase()

  const {
    data: { session },
    error: sessionError,
  } = await client.auth.getSession()

  if (sessionError) {
    throw sessionError
  }

  if (!session?.access_token) {
    throw new Error('You must be logged in as admin before creating an agent.')
  }

  const invocation = client.functions.invoke('create-agent-account', {
    body: {
      fullName: input.fullName,
      email: input.email,
      password: input.password,
      phone: input.phone ?? null,
      storeId: input.storeId,
      referralCode: slugify(input.referralCode?.trim() || input.fullName),
      commissionType: input.commissionType,
      commissionValue: input.commissionValue,
    },
    headers: {
      Authorization: `Bearer ${session.access_token}`,
    },
  })

  const timeout = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(
        new Error(
          'The create-agent-account request timed out. Check the deployed Edge Function and runtime secrets.',
        ),
      )
    }, 15000)
  })

  const { data, error } = (await Promise.race([invocation, timeout])) as Awaited<
    typeof invocation
  >

  if (error) {
    const functionError = data as { error?: string } | null
    throw new Error(
      functionError?.error ||
        error.message ||
        'The create-agent-account function returned a non-2xx status code.',
    )
  }

  return data as {
    userId: string
    agentId: string
    storeId: string
    email: string
    role: 'agent'
  }
}

export async function fetchAdminAgentWorkspace(storeId: string): Promise<AgentWorkspace> {
  const client = ensureSupabase()

  const [{ data: agents, error: agentsError }, { data: links, error: linksError }, { data: commissions, error: commissionsError }, { data: payouts, error: payoutsError }, { data: referrals, error: referralsError }] = await Promise.all([
    client
      .from('agents')
      .select(
        'id, store_id, profile_id, referral_code, commission_type, commission_value, is_active, created_at, updated_at, profile:profile_id(id, full_name, email, phone)',
      )
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),
    client
      .from('agent_links')
      .select('id, store_id, agent_id, code, target_type, target_product_id, is_active, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),
    client
      .from('commissions')
      .select(
        'id, store_id, agent_id, order_id, commission_type, commission_rate_or_value, commission_amount, status, payout_id, approved_at, paid_at, created_at, updated_at',
      )
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),
    client
      .from('commission_payouts')
      .select(
        'id, store_id, agent_id, payout_reference, total_amount, payout_method, payout_notes, processed_by, processed_at, idempotency_key, created_at',
      )
      .eq('store_id', storeId)
      .order('processed_at', { ascending: false }),
    client
      .from('order_referrals')
      .select('id, store_id, order_id, agent_id, referral_code_used, attribution_source, created_at')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false }),
  ])

  if (agentsError) throw agentsError
  if (linksError) throw linksError
  if (commissionsError) throw commissionsError
  if (payoutsError) throw payoutsError
  if (referralsError) throw referralsError

  return {
    agents: (agents ?? []) as AgentAdminRow[],
    links: (links ?? []) as AgentLinkRow[],
    commissions: (commissions ?? []) as AgentCommissionRow[],
    payouts: (payouts ?? []) as AgentPayoutRow[],
    referrals: (referrals ?? []) as AgentReferralRow[],
  }
}

export async function fetchAgentPortal(profileId: string) {
  const client = ensureSupabase()

  const { data: agent, error: agentError } = await client
    .from('agents')
    .select(
      'id, store_id, profile_id, referral_code, commission_type, commission_value, is_active, created_at, updated_at, profile:profile_id(id, full_name, email, phone)',
    )
    .eq('profile_id', profileId)
    .maybeSingle()

  if (agentError) {
    throw agentError
  }

  const agentRow = (agent ?? null) as AgentAdminRow | null

  if (!agentRow) {
    return {
      agent: null,
      links: [] as AgentLinkRow[],
      commissions: [] as AgentCommissionRow[],
      payouts: [] as AgentPayoutRow[],
      referrals: [] as AgentReferralRow[],
    }
  }

  const [{ data: links, error: linksError }, { data: commissions, error: commissionsError }, { data: payouts, error: payoutsError }, { data: referrals, error: referralsError }] = await Promise.all([
    client
      .from('agent_links')
      .select('id, store_id, agent_id, code, target_type, target_product_id, is_active, created_at')
      .eq('agent_id', agentRow.id)
      .order('created_at', { ascending: false }),
    client
      .from('commissions')
      .select(
        'id, store_id, agent_id, order_id, commission_type, commission_rate_or_value, commission_amount, status, payout_id, approved_at, paid_at, created_at, updated_at',
      )
      .eq('agent_id', agentRow.id)
      .order('created_at', { ascending: false }),
    client
      .from('commission_payouts')
      .select(
        'id, store_id, agent_id, payout_reference, total_amount, payout_method, payout_notes, processed_by, processed_at, idempotency_key, created_at',
      )
      .eq('agent_id', agentRow.id)
      .order('processed_at', { ascending: false }),
    client
      .from('order_referrals')
      .select('id, store_id, order_id, agent_id, referral_code_used, attribution_source, created_at')
      .eq('agent_id', agentRow.id)
      .order('created_at', { ascending: false }),
  ])

  if (linksError) throw linksError
  if (commissionsError) throw commissionsError
  if (payoutsError) throw payoutsError
  if (referralsError) throw referralsError

  return {
    agent: agentRow,
    links: (links ?? []) as AgentLinkRow[],
    commissions: (commissions ?? []) as AgentCommissionRow[],
    payouts: (payouts ?? []) as AgentPayoutRow[],
    referrals: (referrals ?? []) as AgentReferralRow[],
  }
}

export async function updateAgent(agentId: string, input: UpdateAgentInput) {
  const client = getWriteClient()
  const payload = {
    referral_code: slugify(input.referralCode?.trim() || input.fullName),
    commission_type: input.commissionType,
    commission_value: input.commissionValue,
    is_active: input.isActive,
  }

  const { data, error } = await client
    .from('agents')
    .update(payload)
    .eq('id', agentId)
    .select(
      'id, store_id, profile_id, referral_code, commission_type, commission_value, is_active, created_at, updated_at',
    )
    .single()

  if (error) {
    throw error
  }

  return data as AgentAdminRow
}

export async function processPayout(input: {
  storeId: string
  agentId: string
  processedBy: string
  idempotencyKey: string
  payoutMethod: string
  payoutNotes?: string
}) {
  const client = ensureSupabase() as unknown as {
    rpc: (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown[] | null; error: Error | null }>
  }

  const { data, error } = await client.rpc('process_commission_payout', {
    p_store_id: input.storeId,
    p_agent_id: input.agentId,
    p_processed_by: input.processedBy,
    p_idempotency_key: input.idempotencyKey,
    p_payout_method: input.payoutMethod,
    p_payout_notes: input.payoutNotes ?? null,
  })

  if (error) {
    throw error
  }

  return (data?.[0] ?? null) as ProcessPayoutResult | null
}
