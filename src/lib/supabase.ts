import { createClient } from '@supabase/supabase-js'

import { env } from './env'
import type { Database } from '../types/database'

export const supabase = env.hasSupabase
  ? createClient<Database>(env.supabaseUrl!, env.supabaseAnonKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null
