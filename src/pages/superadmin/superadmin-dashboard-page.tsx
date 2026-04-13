import { useEffect, useState } from 'react'
import { ArrowRight, Building2, Paintbrush2, UserRoundCog } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { PageHeader } from '../../components/shared/page-header'
import { StatCard } from '../../components/shared/stat-card'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import {
  fetchSuperadminOverview,
  type SuperadminOverview,
} from '../../features/auth/superadmin-service'

export function SuperadminDashboardPage() {
  const [overview, setOverview] = useState<SuperadminOverview | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadOverview() {
      setIsLoading(true)

      try {
        const data = await fetchSuperadminOverview()
        setOverview(data)
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to load superadmin overview.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadOverview()
  }, [])

  const stats = overview
    ? [
        {
          label: 'Store Setup',
          value: String(overview.totalStores),
          helper:
            overview.totalStores > 0
              ? `${overview.activeStores} active configured store`
              : 'No store configured yet',
        },
        {
          label: 'Owner/Admin',
          value: String(overview.adminAccounts),
          helper: 'Assigned operating owner account',
        },
        {
          label: 'Website Control',
          value: String(overview.brandedStores),
          helper: 'Storefront branding and content configured by superadmin',
        },
        {
          label: 'Turnover ready',
          value: String(overview.readyForTurnover),
          helper: 'Single-store handoff readiness',
        },
      ]
    : []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Superadmin"
        title="Prepare the single store for a clean owner handoff."
        description="This workspace is for one client store at a time. Superadmin controls the storefront, branding, and website content; the store owner/admin only runs operations like products, agents, orders, POS, and sales."
      />

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading superadmin overview...</Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((item) => (
            <StatCard key={item.label} {...item} />
          ))}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                1. Configure the store
              </h2>
              <p className="text-sm text-slate-600">
                Create or review the single live store record used by this deployment.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link to="/superadmin/stores" className="inline-flex items-center gap-2">
              Open stores
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Paintbrush2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                2. Control website content
              </h2>
              <p className="text-sm text-slate-600">
                Save the storefront branding, contact copy, and website-facing content.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link
              to="/superadmin/branding"
              className="inline-flex items-center gap-2"
            >
              Open branding manager
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>

        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <UserRoundCog className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                3. Assign the owner/admin
              </h2>
              <p className="text-sm text-slate-600">
                Provision the single operating owner account and attach it to the store.
              </p>
            </div>
          </div>
          <Button asChild variant="secondary">
            <Link
              to="/superadmin/admins"
              className="inline-flex items-center gap-2"
            >
              Open admin accounts
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}
