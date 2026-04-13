import { useEffect, useState } from 'react'
import { Copy } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { StatCard } from '../../components/shared/stat-card'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { fetchAgentPortal } from '../../features/agents/agent-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency } from '../../lib/utils'

export function AgentDashboardPage() {
  const profile = useAuthStore((state) => state.profile)
  const [portal, setPortal] = useState<Awaited<ReturnType<typeof fetchAgentPortal>> | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadPortal() {
      if (!profile?.id) {
        setPortal(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        setPortal(await fetchAgentPortal(profile.id))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load agent dashboard.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadPortal()
  }, [profile?.id])

  if (isLoading) {
    return <Card className="text-sm text-slate-600">Loading agent dashboard...</Card>
  }

  if (!portal?.agent) {
    return (
      <EmptyState
        title="No agent account found"
        description="This user is not attached to an active agent record yet."
      />
    )
  }

  const outstanding = portal.commissions
    .filter((commission) => ['approved', 'locked'].includes(commission.status) && !commission.payout_id)
    .reduce((sum, commission) => sum + commission.commission_amount, 0)
  const paid = portal.commissions
    .filter((commission) => commission.status === 'paid')
    .reduce((sum, commission) => sum + commission.commission_amount, 0)
  const total = portal.commissions.reduce((sum, commission) => sum + commission.commission_amount, 0)
  const link = `${window.location.origin}?ref=${portal.agent.referral_code}`

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agent"
        title="See referral performance, commissions, and payout history in one place."
        description="Agents only see their own referral links, attributed orders, commission rows, and payout batches."
      />

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard
          label="Converted orders"
          value={String(portal.referrals.length)}
          helper="Orders successfully attributed to your referral code."
        />
        <StatCard
          label="Lifetime commission"
          value={formatCurrency(total)}
          helper="All valid commission rows across your history."
        />
        <StatCard
          label="Outstanding"
          value={formatCurrency(outstanding)}
          helper="Approved or locked commissions not yet paid."
        />
        <StatCard
          label="Paid"
          value={formatCurrency(paid)}
          helper="Historical commissions already included in payouts."
        />
      </div>

      <Card className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h2 className="text-lg font-semibold text-slate-950">Referral link</h2>
          <p className="mt-1 text-sm text-slate-600">
            Share this link to capture attribution through `?ref=`.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-full bg-slate-50 px-4 py-3 text-sm text-slate-700">
          <span>{link}</span>
          <Button
            variant="secondary"
            className="rounded-full"
            onClick={async () => {
              await navigator.clipboard.writeText(link)
              toast.success('Referral link copied.')
            }}
          >
            <Copy className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      <Card className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-950">Latest referred orders</h2>
        {portal.referrals.length === 0 ? (
          <p className="text-sm text-slate-600">No referred orders yet.</p>
        ) : (
          <div className="space-y-3">
            {portal.referrals.slice(0, 5).map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-950">{referral.order_id}</p>
                  <p className="text-sm text-slate-500">{referral.referral_code_used}</p>
                </div>
                <p className="text-sm text-slate-600">{referral.attribution_source}</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
