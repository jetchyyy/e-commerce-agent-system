import { useEffect } from 'react'

import {
  fetchProfile,
  getCurrentSession,
  onAuthStateChange,
} from './auth-service'
import { useAuthStore } from '../../stores/auth-store'

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((state) => state.session)
  const setSession = useAuthStore((state) => state.setSession)
  const setProfile = useAuthStore((state) => state.setProfile)
  const setReady = useAuthStore((state) => state.setReady)

  useEffect(() => {
    let isMounted = true

    async function bootstrap() {
      setReady(false)

      try {
        const currentSession = await getCurrentSession()

        if (!isMounted) {
          return
        }

        setSession(currentSession)

        if (!currentSession?.user.id) {
          setProfile(null)
          setReady(true)
        }
      } catch (error) {
        console.error('Failed to restore session', error)

        if (isMounted) {
          setSession(null)
          setProfile(null)
          setReady(true)
        }
      }
    }

    void bootstrap()

    const { data } = onAuthStateChange((_, nextSession) => {
      if (!isMounted) {
        return
      }

      setSession(nextSession)

      if (!nextSession?.user.id) {
        setProfile(null)
        setReady(true)
      }
    })

    const safetyTimer = window.setTimeout(() => {
      if (isMounted) {
        setReady(true)
      }
    }, 5000)

    return () => {
      isMounted = false
      window.clearTimeout(safetyTimer)
      data.subscription.unsubscribe()
    }
  }, [setProfile, setReady, setSession])

  useEffect(() => {
    const userId = session?.user.id

    if (!userId) {
      return
    }

    const currentUserId = userId

    let isMounted = true

    async function loadProfile() {
      setReady(false)

      try {
        const profile = await fetchProfile(currentUserId)

        if (isMounted) {
          setProfile(profile)
        }
      } catch (error) {
        console.error('Failed to load profile', error)

        if (isMounted) {
          setProfile(null)
        }
      } finally {
        if (isMounted) {
          setReady(true)
        }
      }
    }

    void loadProfile()

    return () => {
      isMounted = false
    }
  }, [session?.user.id, setProfile, setReady])

  return children
}
