import { useEffect, useState } from 'react'

import { fetchBranding } from './catalog-service'
import { drilabStorefrontContent } from '../../lib/storefront-content'
import type { StoreBranding } from '../../types/domain'

export function useStorefrontBranding() {
  const [branding, setBranding] = useState<StoreBranding | null>(null)
  const [isLoadingBranding, setIsLoadingBranding] = useState(true)

  useEffect(() => {
    let isMounted = true

    async function loadBranding() {
      setIsLoadingBranding(true)

      try {
        const data = await fetchBranding()

        if (isMounted) {
          setBranding(data)
        }
      } catch (error) {
        console.error('Unable to load storefront branding', error)
      } finally {
        if (isMounted) {
          setIsLoadingBranding(false)
        }
      }
    }

    void loadBranding()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    branding,
    isLoadingBranding,
    content: branding?.storefront_content ?? drilabStorefrontContent,
  }
}
