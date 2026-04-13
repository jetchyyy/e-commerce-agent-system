import { Link, NavLink, Outlet } from 'react-router-dom'
import { Store } from 'lucide-react'

import { Button } from '../components/ui/button'
import { signOut } from '../features/auth/auth-service'
import { cn } from '../lib/utils'
import { useAuthStore } from '../stores/auth-store'
import type { DashboardNavLink } from './dashboard-navigation'

interface DashboardLayoutProps {
  title: string
  description: string
  links: DashboardNavLink[]
}

export function DashboardLayout({
  title,
  description,
  links,
}: DashboardLayoutProps) {
  const profile = useAuthStore((state) => state.profile)

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slate-800 bg-slate-950/95 px-6 py-8 lg:border-b-0 lg:border-r">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">
                Workspace
              </p>
              <h1 className="text-lg font-semibold text-white">{title}</h1>
            </div>
          </Link>

          <p className="mt-4 text-sm leading-7 text-slate-400">{description}</p>

          <nav className="mt-10 space-y-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-slate-400 transition hover:bg-slate-900 hover:text-white',
                    isActive && 'bg-white text-slate-950 hover:bg-white',
                  )
                }
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-10 rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-sm font-medium text-white">
              {profile?.full_name ?? 'Signed-out user'}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {profile?.email ?? 'Connect Supabase auth to load role-aware data'}
            </p>
            <Button
              variant="secondary"
              className="mt-4 w-full border-slate-700 bg-slate-950 text-slate-100 hover:bg-slate-800"
              onClick={() => {
                void signOut()
              }}
            >
              Sign out
            </Button>
          </div>
        </aside>

        <main className="bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.18),_transparent_20%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_70%)] px-4 py-8 text-slate-950 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
