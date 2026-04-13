import { createClient } from 'jsr:@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'

interface CreateAgentRequest {
  fullName: string
  email: string
  password: string
  phone?: string | null
  storeId: string
  referralCode: string
  commissionType: 'fixed' | 'percentage'
  commissionValue: number
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing required Supabase runtime environment variables.')
    }

    const authHeader = request.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()
    if (!accessToken) {
      return new Response(JSON.stringify({ error: 'Missing bearer token.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(accessToken)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized request.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: requesterProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role, store_id')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (!requesterProfile || !['admin', 'superadmin'].includes(requesterProfile.role)) {
      return new Response(
        JSON.stringify({ error: 'Only admin or superadmin can create agent accounts.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const body = (await request.json()) as CreateAgentRequest

    if (
      !body.fullName ||
      !body.email ||
      !body.password ||
      !body.storeId ||
      !body.referralCode ||
      !body.commissionType
    ) {
      return new Response(
        JSON.stringify({
          error:
            'fullName, email, password, storeId, referralCode, and commissionType are required.',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    if (requesterProfile.role === 'admin' && requesterProfile.store_id !== body.storeId) {
      return new Response(
        JSON.stringify({ error: 'Admin can only create agents for their assigned store.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: store, error: storeError } = await adminClient
      .from('stores')
      .select('id')
      .eq('id', body.storeId)
      .maybeSingle()

    if (storeError) {
      throw storeError
    }

    if (!store) {
      return new Response(JSON.stringify({ error: 'Selected store was not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: existingProfile, error: existingProfileError } = await adminClient
      .from('profiles')
      .select('id')
      .or(`email.eq.${body.email},email.eq.${body.email.toLowerCase()}`)
      .maybeSingle()

    if (existingProfileError) {
      throw existingProfileError
    }

    if (existingProfile) {
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists.' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: existingAgent, error: existingAgentError } = await adminClient
      .from('agents')
      .select('id')
      .eq('referral_code', body.referralCode)
      .maybeSingle()

    if (existingAgentError) {
      throw existingAgentError
    }

    if (existingAgent) {
      return new Response(
        JSON.stringify({ error: 'This referral code is already in use.' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email: body.email,
        password: body.password,
        email_confirm: true,
        user_metadata: {
          full_name: body.fullName,
          phone: body.phone ?? null,
        },
      })

    if (createUserError || !createdUser.user) {
      throw createUserError ?? new Error('Unable to create auth user.')
    }

    const { error: profileUpsertError } = await adminClient.from('profiles').upsert({
      id: createdUser.user.id,
      role: 'agent',
      store_id: body.storeId,
      full_name: body.fullName,
      email: body.email,
      phone: body.phone ?? null,
      is_active: true,
    })

    if (profileUpsertError) {
      throw profileUpsertError
    }

    const { data: agent, error: agentInsertError } = await adminClient
      .from('agents')
      .insert({
        store_id: body.storeId,
        profile_id: createdUser.user.id,
        referral_code: body.referralCode,
        commission_type: body.commissionType,
        commission_value: body.commissionValue,
        is_active: true,
      })
      .select('id')
      .single()

    if (agentInsertError || !agent) {
      throw agentInsertError ?? new Error('Unable to create agent record.')
    }

    const { error: linkInsertError } = await adminClient.from('agent_links').insert({
      store_id: body.storeId,
      agent_id: agent.id,
      code: body.referralCode,
      is_active: true,
    })

    if (linkInsertError) {
      throw linkInsertError
    }

    const { error: auditError } = await adminClient.from('audit_logs').insert({
      store_id: body.storeId,
      actor_profile_id: requesterProfile.id,
      entity_type: 'agent',
      entity_id: agent.id,
      action: 'create_agent_account',
      details: {
        email: body.email,
        referral_code: body.referralCode,
        commission_type: body.commissionType,
        commission_value: body.commissionValue,
      },
    })

    if (auditError) {
      throw auditError
    }

    return new Response(
      JSON.stringify({
        userId: createdUser.user.id,
        agentId: agent.id,
        storeId: body.storeId,
        email: body.email,
        role: 'agent',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'Unexpected error creating agent account.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
