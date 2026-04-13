import { ArrowRight, LayoutGrid, ShieldCheck, TicketPercent } from 'lucide-react'
import { Link } from 'react-router-dom'

import { BrandBadge } from '../../components/shared/brand-badge'
import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { SetupBanner } from '../../components/shared/setup-banner'
import { StatCard } from '../../components/shared/stat-card'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { useStorefrontBranding } from '../../features/catalog/use-storefront-branding'

const highlights = [
  {
    label: 'Inventory-safe checkout',
    value: 'Atomic',
    helper: 'Checkout and POS both call the same locked stock deduction flow.',
  },
  {
    label: 'Agent payout control',
    value: 'Auditable',
    helper: 'Commissions move from pending to approved to paid inside SQL transactions.',
  },
  {
    label: 'Branding system',
    value: 'White-label',
    helper: 'Theme tokens, receipt text, and store identity are stored in Supabase.',
  },
]

export function HomePage() {
  const { content } = useStorefrontBranding()

  return (
    <div className="space-y-10">
      <SetupBanner />

      <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="space-y-6">
          <BrandBadge />
          <PageHeader
            eyebrow={content.home.eyebrow}
            title={content.home.title}
            description={content.home.description}
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild>
              <Link to="/shop" className="inline-flex items-center gap-2">
                {content.home.primaryCtaLabel}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link to="/shop">{content.home.secondaryCtaLabel}</Link>
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden bg-slate-950 text-white">
          <div className="grid gap-5 rounded-[1.6rem] border border-white/10 bg-white/5 p-5 md:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="text-sm text-slate-300">{content.home.featureCardTitle}</p>
                <p className="mt-3 text-2xl font-semibold">{content.home.featureCardBody}</p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <ShieldCheck className="h-4 w-4" />
                  Secure checkout RPC
                </p>
                <p className="mt-3 text-lg font-semibold">
                  Database-side validation, row locks, and idempotency keys.
                </p>
              </div>
              <div className="rounded-3xl bg-white/10 p-5">
                <p className="flex items-center gap-2 text-sm text-slate-300">
                  <TicketPercent className="h-4 w-4" />
                  Agent referrals
                </p>
                <p className="mt-3 text-lg font-semibold">
                  Track revenue, calculate commissions, and process payouts safely.
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-[1.6rem] bg-amber-300/90 text-slate-950">
              {content.home.heroImage.url ? (
                <img
                  src={content.home.heroImage.url}
                  alt={content.home.heroImage.alt}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[320px] flex-col justify-end bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.4),_transparent_28%),linear-gradient(135deg,_#fed7aa_0%,_#fb923c_45%,_#7c2d12_100%)] p-6">
                  <p className="text-sm font-medium uppercase tracking-[0.25em]">
                    Drilab preview
                  </p>
                  <p className="mt-3 text-2xl font-semibold">{content.home.storyTitle}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-900/80">
                    {content.home.storyBody}
                  </p>
                </div>
              )}
            </div>
          </div>
        </Card>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <StatCard key={item.label} {...item} />
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4 lg:col-span-2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
              <LayoutGrid className="h-5 w-5 text-slate-700" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-slate-950">
                What is already scaffolded
              </h2>
              <p className="text-sm text-slate-600">
                Routing, layouts, forms, Supabase service boundaries, and setup
                docs for storefront, admin, superadmin, and agent roles.
              </p>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-slate-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Customer
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Homepage, catalog, product details, cart, checkout, account,
                orders, and profile screens.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Store admin
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Dashboard, products, categories, orders, POS, analytics,
                inventory, agents, and white-label settings.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Superadmin
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Store provisioning, admin account oversight, branding control,
                and support access.
              </p>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">
                Agent
              </h3>
              <p className="mt-3 text-sm leading-7 text-slate-700">
                Referral links, commissions, payout history, and performance
                dashboard with role isolation.
              </p>
            </div>
          </div>
        </Card>

        <EmptyState
          title="No live products yet"
          description="This starter intentionally avoids mock products and fake customer data. After you run the SQL and create your first store admin, the storefront will render only real records."
          action={
            <Button asChild variant="secondary">
              <Link to="/admin/products">Go to product management</Link>
            </Button>
          }
        />
      </section>
    </div>
  )
}
