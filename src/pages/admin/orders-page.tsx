import { useEffect, useMemo, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Search } from 'lucide-react'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'

import { DataTable } from '../../components/shared/data-table'
import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { fetchOrdersByStore, type OrderListRow } from '../../features/operations/operations-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency, formatDate } from '../../lib/utils'

const columns: ColumnDef<OrderListRow>[] = [
  {
    header: 'Order',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-950">{row.original.order_number}</p>
        <p className="text-xs text-slate-500">{row.original.source.toUpperCase()}</p>
      </div>
    ),
  },
  {
    header: 'Customer',
    cell: ({ row }) =>
      row.original.customer?.full_name ||
      row.original.customer?.email ||
      'Walk-in / guest',
  },
  {
    header: 'Status',
    accessorKey: 'status',
  },
  {
    header: 'Payment',
    accessorKey: 'payment_status',
  },
  {
    header: 'Total',
    cell: ({ row }) => formatCurrency(row.original.total_amount),
  },
  {
    header: 'Placed',
    cell: ({ row }) => formatDate(row.original.placed_at),
  },
]

export function OrdersPage() {
  const profile = useAuthStore((state) => state.profile)
  const [orders, setOrders] = useState<OrderListRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')

  useEffect(() => {
    async function loadOrders() {
      if (!profile?.store_id) {
        setOrders([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        setOrders(await fetchOrdersByStore(profile.store_id))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load orders.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadOrders()
  }, [profile?.store_id])

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        !search ||
        [
          order.order_number,
          order.customer?.full_name,
          order.customer?.email,
          order.customer?.phone,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search.toLowerCase()))

      const matchesStatus = !status || order.status === status
      return matchesSearch && matchesStatus
    })
  }, [orders, search, status])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Orders"
        title="Search, review, and fulfill store orders."
        description="Online orders and POS sales stay distinguishable by source while sharing the same inventory-safe order records."
      />

      <Card className="grid gap-4 md:grid-cols-[1fr_240px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-11"
            placeholder="Search order number, customer, or phone"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <Select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">All statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="processing">Processing</option>
          <option value="ready_for_pickup">Ready for pickup</option>
          <option value="out_for_delivery">Out for delivery</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </Select>
      </Card>

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading store orders...</Card>
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title="No orders found"
          description="Orders will appear here after customers checkout or staff complete POS transactions."
        />
      ) : (
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={filteredOrders}
            emptyTitle="No orders"
            emptyDescription="There are no matching orders yet."
          />

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filteredOrders.map((order) => (
              <Card key={order.id} className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-950">{order.order_number}</p>
                    <p className="text-sm text-slate-500">
                      {order.customer?.full_name || order.customer?.email || 'Walk-in / guest'}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                    {order.status.replaceAll('_', ' ')}
                  </span>
                </div>

                <div className="grid gap-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Source</span>
                    <span className="font-medium text-slate-900">{order.source}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Total</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(order.total_amount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Placed</span>
                    <span className="font-medium text-slate-900">
                      {formatDate(order.placed_at)}
                    </span>
                  </div>
                </div>

                <Button asChild variant="secondary" className="w-full">
                  <Link to={`/admin/orders/${order.id}`}>Open order</Link>
                </Button>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
