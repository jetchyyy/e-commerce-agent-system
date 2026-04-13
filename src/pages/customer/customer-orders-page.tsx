import { useEffect, useState } from 'react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Card } from '../../components/ui/card'
import { fetchCustomerOrders, type OrderListRow } from '../../features/operations/operations-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency, formatDate } from '../../lib/utils'

export function CustomerOrdersPage() {
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
        toast.error(error instanceof Error ? error.message : 'Unable to load order history.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadOrders()
  }, [profile?.id])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="My orders"
        title="Track your order history and fulfillment progress."
        description="Each customer only sees their own orders through RLS, including totals, source, and current status."
      />

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading your orders...</Card>
      ) : orders.length === 0 ? (
        <EmptyState
          title="No customer orders yet"
          description="Once you place a real order, it will appear here with the latest status."
        />
      ) : (
        <div className="grid gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="space-y-3">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-lg font-semibold text-slate-950">{order.order_number}</p>
                  <p className="text-sm text-slate-500">{formatDate(order.placed_at)}</p>
                </div>
                <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-medium capitalize text-slate-700">
                  {order.status.replaceAll('_', ' ')}
                </span>
              </div>

              <div className="grid gap-3 text-sm text-slate-700 md:grid-cols-3">
                <div>
                  <p className="text-slate-500">Source</p>
                  <p className="font-medium text-slate-950">{order.source}</p>
                </div>
                <div>
                  <p className="text-slate-500">Payment</p>
                  <p className="font-medium text-slate-950">{order.payment_status}</p>
                </div>
                <div>
                  <p className="text-slate-500">Total</p>
                  <p className="font-medium text-slate-950">
                    {formatCurrency(order.total_amount)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
                Order progress: {order.status.replaceAll('_', ' ')}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
