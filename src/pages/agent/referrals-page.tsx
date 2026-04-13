import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Card } from '../../components/ui/card'
import { fetchAgentPortal } from '../../features/agents/agent-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatDate } from '../../lib/utils'

export function ReferralsPage() {
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
        toast.error(error instanceof Error ? error.message : 'Unable to load referrals.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadPortal()
  }, [profile?.id])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Referral links"
        title="Track referral attribution and campaign activity."
        description="Each order can only have one valid attribution, and the final referral linkage is validated on the backend."
      />

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading referral records...</Card>
      ) : !portal?.agent || portal.referrals.length === 0 ? (
        <EmptyState
          title="No referral records yet"
          description="Orders attributed to your links will appear here."
        />
      ) : (
        <div className="space-y-4">
          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950">My active links</h2>
            {portal.links.map((link) => (
              <div
                key={link.id}
                className="rounded-2xl border border-slate-100 px-4 py-3 text-sm text-slate-700"
              >
                <p className="font-medium text-slate-950">{link.code}</p>
                <p className="text-slate-500">
                  Created {formatDate(link.created_at)} • {link.is_active ? 'Active' : 'Inactive'}
                </p>
              </div>
            ))}
          </Card>

          <Card className="space-y-3">
            <h2 className="text-lg font-semibold text-slate-950">Attributed orders</h2>
            {portal.referrals.map((referral) => (
              <div
                key={referral.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
              >
                <div>
                  <p className="font-medium text-slate-950">{referral.order_id}</p>
                  <p className="text-sm text-slate-500">{referral.referral_code_used}</p>
                </div>
                <div className="text-right text-sm text-slate-600">
                  <p>{referral.attribution_source}</p>
                  <p>{formatDate(referral.created_at)}</p>
                </div>
              </div>
            ))}
          </Card>
        </div>
      )}
    </div>
  )
}
