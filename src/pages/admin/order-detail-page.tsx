import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import {
  fetchOrderById,
  updateOrderStatus,
  type CommissionRow,
  type OrderItemRow,
  type OrderListRow,
  type OrderReferralRow,
  type PosTransactionRow,
} from '../../features/operations/operations-service'
import type { OrderStatus } from '../../types/domain'
import { formatCurrency, formatDate } from '../../lib/utils'

const statusOptions: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'ready_for_pickup',
  'out_for_delivery',
  'completed',
  'cancelled',
]

export function OrderDetailPage() {
  const { orderId } = useParams()
  const [order, setOrder] = useState<OrderListRow | null>(null)
  const [items, setItems] = useState<OrderItemRow[]>([])
  const [referral, setReferral] = useState<OrderReferralRow | null>(null)
  const [commissions, setCommissions] = useState<CommissionRow[]>([])
  const [posTransaction, setPosTransaction] = useState<PosTransactionRow | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await fetchOrderById(orderId)
      setOrder(result.order)
      setItems(result.items)
      setReferral(result.referral)
      setCommissions(result.commissions)
      setPosTransaction(result.posTransaction)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load order.')
    } finally {
      setIsLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  async function handleStatusChange(status: OrderStatus) {
    if (!order) {
      return
    }

    setIsSaving(true)
    try {
      await updateOrderStatus(order.id, status)
      toast.success(`Order status updated to ${status.replaceAll('_', ' ')}.`)
      await loadOrder()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update status.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return <Card className="text-sm text-slate-600">Loading order details...</Card>
  }

  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        description="This order may not exist or you may not have permission to view it."
      />
    )
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Order detail"
        title={order.order_number}
        description="Review customer details, itemized lines, payment summary, referral attribution, and safe status transitions."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Items</h2>
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-950">{item.product_name}</p>
                    <p className="text-sm text-slate-500">
                      {item.sku} • Qty {item.quantity}
                    </p>
                  </div>
                  <p className="font-semibold text-slate-950">
                    {formatCurrency(item.line_total)}
                  </p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Referral and commission</h2>
            {referral ? (
              <div className="space-y-3 text-sm text-slate-700">
                <p>
                  Referral code used: <span className="font-semibold">{referral.referral_code_used}</span>
                </p>
                <p>Attribution source: {referral.attribution_source}</p>
                <p>Referral captured: {formatDate(referral.created_at)}</p>
              </div>
            ) : (
              <p className="text-sm text-slate-600">No agent referral is attached to this order.</p>
            )}

            {commissions.length > 0 ? (
              <div className="space-y-3">
                {commissions.map((commission) => (
                  <div
                    key={commission.id}
                    className="rounded-2xl border border-slate-100 px-4 py-3 text-sm text-slate-700"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-slate-950">
                        {formatCurrency(commission.commission_amount)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                        {commission.status}
                      </span>
                    </div>
                    <p className="mt-2">
                      {commission.commission_type} at {commission.commission_rate_or_value}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Summary</h2>
            <div className="space-y-2 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Customer</span>
                <span className="font-medium text-slate-900">
                  {order.customer?.full_name || order.customer?.email || 'Walk-in / guest'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Source</span>
                <span className="font-medium text-slate-900">{order.source}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Payment</span>
                <span className="font-medium text-slate-900">{order.payment_status}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Placed</span>
                <span className="font-medium text-slate-900">
                  {formatDate(order.placed_at)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(order.subtotal_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Discount</span>
                <span className="font-medium text-slate-900">
                  {formatCurrency(order.discount_amount)}
                </span>
              </div>
              <div className="flex items-center justify-between text-base font-semibold text-slate-950">
                <span>Total</span>
                <span>{formatCurrency(order.total_amount)}</span>
              </div>
            </div>
          </Card>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Update status</h2>
            <div className="grid gap-2">
              {statusOptions.map((status) => (
                <Button
                  key={status}
                  variant={order.status === status ? 'primary' : 'secondary'}
                  disabled={isSaving}
                  onClick={() => void handleStatusChange(status)}
                >
                  {status.replaceAll('_', ' ')}
                </Button>
              ))}
            </div>
          </Card>

          {posTransaction ? (
            <Card className="space-y-3">
              <h2 className="text-lg font-semibold text-slate-950">POS receipt</h2>
              <p className="text-sm text-slate-700">
                Receipt number: <span className="font-semibold">{posTransaction.receipt_number}</span>
              </p>
              <p className="text-sm text-slate-700">
                Cash received: {formatCurrency(posTransaction.cash_received)}
              </p>
              <p className="text-sm text-slate-700">
                Change due: {formatCurrency(posTransaction.change_due)}
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
