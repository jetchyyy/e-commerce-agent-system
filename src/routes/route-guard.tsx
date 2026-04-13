import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { Card } from '../components/ui/card'
import type { AppRole } from '../types/domain'
import { useAuthStore } from '../stores/auth-store'

interface RouteGuardProps {
  allow: AppRole[]
}

export function RouteGuard({ allow }: RouteGuardProps) {
  const location = useLocation()
  const isReady = useAuthStore((state) => state.isReady)
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)

  if (!isReady) {
    return (
      <Card className="mx-auto mt-20 max-w-xl">
        <h1 className="text-xl font-semibold text-slate-950">Checking access</h1>
        <p className="mt-2 text-sm text-slate-600">
          We are confirming your session and role permissions.
        </p>
      </Card>
    )
  }

  if (!session || !profile) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  if (!allow.includes(profile.role)) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
