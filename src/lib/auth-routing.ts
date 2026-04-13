import type { AppRole } from '../types/domain'

export function getDefaultRouteForRole(role: AppRole) {
  switch (role) {
    case 'superadmin':
      return '/superadmin'
    case 'admin':
      return '/admin'
    case 'agent':
      return '/agent'
    case 'customer':
    default:
      return '/account'
  }
}
