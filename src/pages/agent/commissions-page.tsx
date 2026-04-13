import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Card } from '../../components/ui/card'
import { fetchAgentPortal } from '../../features/agents/agent-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency, formatDate } from '../../lib/utils'

export function CommissionsPage() {
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
        toast.error(error instanceof Error ? error.message : 'Unable to load commissions.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadPortal()
  }, [profile?.id])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Commissions"
        title="Each commission row maps to a real qualifying order."
        description="Commission states move through trusted backend transitions, so agents always see an auditable breakdown of pending, approved, paid, cancelled, or reversed records."
      />

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading commissions...</Card>
      ) : !portal?.agent || portal.commissions.length === 0 ? (
        <EmptyState
          title="No commission rows yet"
          description="Commission records will appear after valid referred orders are created."
        />
      ) : (
        <div className="grid gap-4">
          {portal.commissions.map((commission) => (
            <Card key={commission.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">
                    {formatCurrency(commission.commission_amount)}
                  </p>
                  <p className="text-sm text-slate-500">Order {commission.order_id}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                  {commission.status}
                </span>
              </div>

              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>
                  <p className="text-slate-500">Commission rule</p>
                  <p className="font-medium text-slate-950">
                    {commission.commission_type} at {commission.commission_rate_or_value}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Created</p>
                  <p className="font-medium text-slate-950">
                    {formatDate(commission.created_at)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Paid at</p>
                  <p className="font-medium text-slate-950">
                    {commission.paid_at ? formatDate(commission.paid_at) : 'Not paid yet'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
