import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Package,
  ReceiptText,
  Store,
  Users,
  WalletCards,
} from 'lucide-react'
import type { ComponentType } from 'react'

export interface DashboardNavLink {
  to: string
  label: string
  icon: ComponentType<{ className?: string }>
}

export const adminLinks: DashboardNavLink[] = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/categories', label: 'Categories', icon: ClipboardList },
  { to: '/admin/orders', label: 'Orders', icon: ReceiptText },
  { to: '/admin/pos', label: 'POS', icon: WalletCards },
  { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
  { to: '/admin/inventory', label: 'Inventory', icon: Package },
  { to: '/admin/agents', label: 'Agents', icon: Users },
]

export const superadminLinks: DashboardNavLink[] = [
  { to: '/superadmin', label: 'Overview', icon: LayoutDashboard },
  { to: '/superadmin/stores', label: 'Stores', icon: Store },
  { to: '/superadmin/admins', label: 'Admin Accounts', icon: Users },
  { to: '/superadmin/branding', label: 'Website Control', icon: ClipboardList },
  { to: '/superadmin/support', label: 'Support', icon: ClipboardList },
]

export const agentLinks: DashboardNavLink[] = [
  { to: '/agent', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agent/referrals', label: 'Referral Links', icon: Users },
  { to: '/agent/commissions', label: 'Commissions', icon: WalletCards },
  { to: '/agent/payouts', label: 'Payouts', icon: ReceiptText },
  { to: '/agent/profile', label: 'Profile', icon: Store },
]
