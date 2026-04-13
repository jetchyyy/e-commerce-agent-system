import { create } from 'zustand'

interface ReferralState {
  referralCode: string | null
  capturedAt: string | null
  persistReferral: (referralCode: string) => void
  clearReferral: () => void
}

const storageKey = 'storefront-referral'

function writeReferral(referralCode: string | null, capturedAt: string | null) {
  if (!referralCode || !capturedAt) {
    window.localStorage.removeItem(storageKey)
    return
  }

  window.localStorage.setItem(
    storageKey,
    JSON.stringify({ referralCode, capturedAt }),
  )
}

export function getStoredReferral() {
  const raw = window.localStorage.getItem(storageKey)

  if (!raw) {
    return { referralCode: null, capturedAt: null }
  }

  try {
    const parsed = JSON.parse(raw) as {
      referralCode?: string
      capturedAt?: string
    }

    return {
      referralCode: parsed.referralCode ?? null,
      capturedAt: parsed.capturedAt ?? null,
    }
  } catch {
    return { referralCode: null, capturedAt: null }
  }
}

const initialState =
  typeof window === 'undefined'
    ? { referralCode: null, capturedAt: null }
    : getStoredReferral()

export const useReferralStore = create<ReferralState>((set) => ({
  referralCode: initialState.referralCode,
  capturedAt: initialState.capturedAt,
  persistReferral: (referralCode) => {
    const capturedAt = new Date().toISOString()
    writeReferral(referralCode, capturedAt)
    set({ referralCode, capturedAt })
  },
  clearReferral: () => {
    writeReferral(null, null)
    set({ referralCode: null, capturedAt: null })
  },
}))
