import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

import { useReferralStore } from '../stores/referral-store'

export function ReferralCapture() {
  const location = useLocation()
  const persistReferral = useReferralStore((state) => state.persistReferral)

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const referralCode = params.get('ref')

    if (referralCode) {
      persistReferral(referralCode)
    }
  }, [location.search, persistReferral])

  return null
}
