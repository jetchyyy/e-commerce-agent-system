import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

import { supabase } from '../../lib/supabase'
import type { Profile } from '../../types/domain'

export async function getCurrentSession() {
  if (!supabase) {
    return null
  }

  const { data } = await supabase.auth.getSession()
  return data.session
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  if (!supabase) {
    return null
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, store_id, full_name, email, role, phone, avatar_url')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export async function signIn(email: string, password: string) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw error
  }

  return data.session
}

export async function signUp(email: string, password: string, fullName: string) {
  if (!supabase) {
    throw new Error('Supabase environment variables are missing.')
  }

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  })

  if (error) {
    throw error
  }
}

export async function signOut() {
  if (!supabase) {
    return
  }

  await supabase.auth.signOut()
}

export function onAuthStateChange(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  if (!supabase) {
    return { data: { subscription: { unsubscribe() {} } } }
  }

  return supabase.auth.onAuthStateChange(callback)
}
