import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { SetupBanner } from '../../components/shared/setup-banner'
import { StatCard } from '../../components/shared/stat-card'
import { Card } from '../../components/ui/card'
import { fetchCustomerOrders, type OrderListRow } from '../../features/operations/operations-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency, formatDate } from '../../lib/utils'

export function CustomerDashboardPage() {
  const profile = useAuthStore((state) => state.profile)
  const [orders, setOrders] = useState<OrderListRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadOrders() {
      if (!profile?.id) {
        setOrders([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        setOrders(await fetchCustomerOrders(profile.id))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load customer orders.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadOrders()
  }, [profile?.id])

  const totalSpent = orders.reduce((sum, order) => sum + order.total_amount, 0)
  const activeOrders = orders.filter((order) =>
    ['pending', 'confirmed', 'processing', 'ready_for_pickup', 'out_for_delivery'].includes(
      order.status,
    ),
  ).length

  return (
    <div className="space-y-8">
      <SetupBanner />
      <PageHeader
        eyebrow="Customer account"
        title="A simple dashboard for orders and account activity."
        description="Customers can quickly review recent orders, totals paid, and active fulfillment progress without navigating admin workflows."
      />

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading your account...</Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <StatCard
              label="Orders"
              value={String(orders.length)}
              helper="All orders placed from this customer account."
            />
            <StatCard
              label="Total paid"
              value={formatCurrency(totalSpent)}
              helper="Cumulative value across your order history."
            />
            <StatCard
              label="Active orders"
              value={String(activeOrders)}
              helper="Orders still moving through fulfillment."
            />
          </div>

          {orders.length === 0 ? (
            <EmptyState
              title="No orders yet"
              description="Your recent purchases will appear here after checkout."
            />
          ) : (
            <Card className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Recent orders</h2>
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-4"
                  >
                    <div>
                      <p className="font-medium text-slate-950">{order.order_number}</p>
                      <p className="text-sm text-slate-500">{formatDate(order.placed_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-slate-950">
                        {formatCurrency(order.total_amount)}
                      </p>
                      <p className="text-sm capitalize text-slate-500">
                        {order.status.replaceAll('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
