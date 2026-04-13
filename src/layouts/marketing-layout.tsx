import { Link, NavLink, Outlet } from 'react-router-dom'
import { ShoppingBag } from 'lucide-react'

import { useStorefrontBranding } from '../features/catalog/use-storefront-branding'
import { cn } from '../lib/utils'

const navItems = [
  { label: 'Home', to: '/' },
  { label: 'Shop', to: '/shop' },
  { label: 'Cart', to: '/cart' },
  { label: 'Track Order', to: '/account/orders' },
  { label: 'Login', to: '/login' },
]

export function MarketingLayout() {
  const { branding, content } = useStorefrontBranding()

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.16),_transparent_24%),linear-gradient(180deg,_#fffdf8_0%,_#f8fafc_50%,_#ffffff_100%)]">
      <div className="border-b border-amber-100 bg-amber-50 px-4 py-3 text-center text-xs font-semibold uppercase tracking-[0.25em] text-slate-700 md:px-8">
        {content.nav.announcement}
      </div>
      <header className="sticky top-0 z-30 border-b border-white/60 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-8">
          <Link to="/" className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950">
                {branding?.store_name ?? content.nav.badgeText}
              </p>
              <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                {content.nav.brandTagline}
              </p>
            </div>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'text-sm font-medium text-slate-600 transition hover:text-slate-950',
                    isActive && 'text-slate-950',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-10 md:px-8 md:py-14">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white/80">
        <div className="mx-auto max-w-7xl px-4 py-8 md:px-8">
          <p className="text-lg font-semibold text-slate-950">{content.footer.heading}</p>
          <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">{content.footer.body}</p>
          <p className="mt-3 text-sm text-slate-600">
            {content.footer.contactLabel}{' '}
            {branding?.support_email ?? branding?.support_phone ?? ''}
          </p>
        </div>
      </footer>
    </div>
  )
}
