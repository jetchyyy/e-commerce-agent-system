import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Card } from '../../components/ui/card'
import { fetchAgentPortal } from '../../features/agents/agent-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency, formatDate } from '../../lib/utils'

export function PayoutsPage() {
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
        toast.error(error instanceof Error ? error.message : 'Unable to load payouts.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadPortal()
  }, [profile?.id])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Payout history"
        title="Audit what was paid and when."
        description="Paid commissions remain historically traceable because each payout batch stays immutable and linked to the commission rows it settled."
      />

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading payout history...</Card>
      ) : !portal?.agent || portal.payouts.length === 0 ? (
        <EmptyState
          title="No payouts yet"
          description="Payout batches will appear here after the store owner processes them."
        />
      ) : (
        <div className="grid gap-4">
          {portal.payouts.map((payout) => (
            <Card key={payout.id} className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-slate-950">{payout.payout_reference}</p>
                  <p className="text-sm text-slate-500">{payout.payout_method}</p>
                </div>
                <p className="text-lg font-semibold text-slate-950">
                  {formatCurrency(payout.total_amount)}
                </p>
              </div>

              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-2">
                <div>
                  <p className="text-slate-500">Processed</p>
                  <p className="font-medium text-slate-950">
                    {formatDate(payout.processed_at)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Notes</p>
                  <p className="font-medium text-slate-950">
                    {payout.payout_notes || 'No payout notes'}
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
