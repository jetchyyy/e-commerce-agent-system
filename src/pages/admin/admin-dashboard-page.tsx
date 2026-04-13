import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { SetupBanner } from '../../components/shared/setup-banner'
import { StatCard } from '../../components/shared/stat-card'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { fetchAdminDashboardSnapshot, type AdminDashboardSnapshot } from '../../features/operations/operations-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency, formatDate } from '../../lib/utils'

export function AdminDashboardPage() {
  const profile = useAuthStore((state) => state.profile)
  const [snapshot, setSnapshot] = useState<AdminDashboardSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadSnapshot() {
      if (!profile?.store_id) {
        setSnapshot(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        setSnapshot(await fetchAdminDashboardSnapshot(profile.store_id))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load dashboard data.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadSnapshot()
  }, [profile?.store_id])

  const stats = snapshot
    ? [
        {
          label: 'Total sales',
          value: formatCurrency(snapshot.totalSales),
          helper: 'Combined paid revenue across online and POS.',
        },
        {
          label: 'Orders',
          value: String(snapshot.totalOrders),
          helper: 'All real order records for the assigned store.',
        },
        {
          label: 'Low stock',
          value: String(snapshot.lowStockItems),
          helper: 'Tracked products at or below their low-stock threshold.',
        },
        {
          label: 'Outstanding commission',
          value: formatCurrency(snapshot.outstandingCommission),
          helper: 'Approved or locked commissions not yet paid out.',
        },
      ]
    : []

  return (
    <div className="space-y-8">
      <SetupBanner />
      <PageHeader
        eyebrow="Store admin"
        title="Operate products, orders, POS, analytics, and agents from one workspace."
        description="This dashboard is for the store owner/admin who runs daily operations. Branding and storefront presentation remain under superadmin control."
      />

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading dashboard...</Card>
      ) : !snapshot ? (
        <EmptyState
          title="No store assigned to this admin"
          description="Attach the admin account to the store before using the operations dashboard."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {stats.map((item) => (
              <StatCard key={item.label} {...item} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
            <Card className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Recent orders</h2>
                  <p className="text-sm text-slate-600">
                    Quick visibility into the latest store activity.
                  </p>
                </div>
                <Button asChild variant="secondary">
                  <Link to="/admin/orders">View all orders</Link>
                </Button>
              </div>

              {snapshot.recentOrders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="Orders will appear here after customer checkout or POS transactions."
                />
              ) : (
                <div className="space-y-3">
                  {snapshot.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-4"
                    >
                      <div>
                        <p className="font-medium text-slate-950">{order.order_number}</p>
                        <p className="text-sm text-slate-500">
                          {order.customer?.full_name || order.customer?.email || 'Walk-in / guest'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-slate-950">
                          {formatCurrency(order.total_amount)}
                        </p>
                        <p className="text-sm text-slate-500">{formatDate(order.placed_at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Operational focus</h2>
              <div className="space-y-3 text-sm text-slate-700">
                <div className="rounded-2xl bg-slate-50 p-4">
                  POS revenue: {formatCurrency(snapshot.totalPosSales)}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  Online revenue: {formatCurrency(snapshot.totalOnlineSales)}
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  Pending fulfillment: {snapshot.pendingOrders} orders
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  Paid commission history: {formatCurrency(snapshot.paidCommission)}
                </div>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
