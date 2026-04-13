import { createClient } from 'jsr:@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'

interface CreateStoreAdminRequest {
  fullName: string
  email: string
  password: string
  phone?: string | null
  storeId: string
  sendInviteEmail?: boolean
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
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    const accessToken = authHeader.replace(/^Bearer\s+/i, '').trim()

    if (!accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing bearer token.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const {
      data: { user },
      error: authError,
    } = await adminClient.auth.getUser(accessToken)

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized request.' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: requesterProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (!requesterProfile || requesterProfile.role !== 'superadmin') {
      return new Response(
        JSON.stringify({ error: 'Only superadmin can create owner/admin accounts.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const body = (await request.json()) as CreateStoreAdminRequest

    if (!body.fullName || !body.email || !body.password || !body.storeId) {
      return new Response(
        JSON.stringify({ error: 'fullName, email, password, and storeId are required.' }),
        {
          status: 400,
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
      return new Response(
        JSON.stringify({ error: 'Selected store was not found.' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const { data: existingAdmin, error: existingAdminError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', body.email)
      .maybeSingle()

    if (existingAdminError) {
      throw existingAdminError
    }

    if (existingAdmin) {
      return new Response(
        JSON.stringify({ error: 'An account with this email already exists.' }),
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

    const { error: updateProfileError } = await adminClient
      .from('profiles')
      .upsert({
        id: createdUser.user.id,
        role: 'admin',
        store_id: body.storeId,
        full_name: body.fullName,
        email: body.email,
        phone: body.phone ?? null,
        is_active: true,
      })

    if (updateProfileError) {
      throw updateProfileError
    }

    const { error: auditError } = await adminClient.from('audit_logs').insert({
      store_id: body.storeId,
      actor_profile_id: requesterProfile.id,
      entity_type: 'profile',
      entity_id: createdUser.user.id,
      action: 'create_store_admin',
      details: {
        email: body.email,
        send_invite_email: body.sendInviteEmail ?? false,
      },
    })

    if (auditError) {
      throw auditError
    }

    return new Response(
      JSON.stringify({
        userId: createdUser.user.id,
        email: body.email,
        storeId: body.storeId,
        role: 'admin',
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
            : 'Unexpected error creating store owner/admin.',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    )
  }
})
