const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const env = {
  supabaseUrl,
  supabaseAnonKey,
  hasSupabase: Boolean(supabaseUrl && supabaseAnonKey),
}
