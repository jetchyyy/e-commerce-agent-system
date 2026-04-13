import { create } from 'zustand'
import type { Session } from '@supabase/supabase-js'

import type { Profile } from '../types/domain'

interface AuthState {
  session: Session | null
  profile: Profile | null
  isReady: boolean
  setSession: (session: Session | null) => void
  setProfile: (profile: Profile | null) => void
  setReady: (isReady: boolean) => void
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isReady: false,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setReady: (isReady) => set({ isReady }),
}))
