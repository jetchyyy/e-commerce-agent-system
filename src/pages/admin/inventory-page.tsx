import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Boxes } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable } from '../../components/shared/data-table'
import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Card } from '../../components/ui/card'
import { fetchInventorySnapshot, type InventoryMovementRow } from '../../features/operations/operations-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatDate } from '../../lib/utils'
import type { Product } from '../../types/domain'
import type { ColumnDef } from '@tanstack/react-table'

type InventoryProduct = Product & { low_stock_threshold: number }

const productColumns: ColumnDef<InventoryProduct>[] = [
  { header: 'Product', accessorKey: 'name' },
  { header: 'SKU', accessorKey: 'sku' },
  { header: 'Stock', accessorKey: 'stock_quantity' },
  { header: 'Low stock threshold', accessorKey: 'low_stock_threshold' },
  {
    header: 'Status',
    cell: ({ row }) =>
      row.original.track_inventory
        ? row.original.stock_quantity <= row.original.low_stock_threshold
          ? 'Low stock'
          : 'Healthy'
        : 'Not tracked',
  },
]

const movementColumns: ColumnDef<InventoryMovementRow>[] = [
  {
    header: 'Product',
    cell: ({ row }) => row.original.product?.name ?? 'Unknown product',
  },
  { header: 'Reason', accessorKey: 'reason' },
  { header: 'Delta', accessorKey: 'quantity_delta' },
  {
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.created_at),
  },
]

export function InventoryPage() {
  const profile = useAuthStore((state) => state.profile)
  const [products, setProducts] = useState<InventoryProduct[]>([])
  const [movements, setMovements] = useState<InventoryMovementRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadInventory() {
      if (!profile?.store_id) {
        setProducts([])
        setMovements([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const data = await fetchInventorySnapshot(profile.store_id)
        setProducts(data.products)
        setMovements(data.movements)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load inventory.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadInventory()
  }, [profile?.store_id])

  const lowStockProducts = useMemo(
    () =>
      products.filter(
        (product) =>
          product.track_inventory &&
          !product.archived_at &&
          product.stock_quantity <= product.low_stock_threshold,
      ),
    [products],
  )

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Inventory"
        title="Monitor stock levels and movement history."
        description="Inventory changes from online checkout, POS, and other stock events remain auditable through movement records."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <Boxes className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Tracked products</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{products.length}</p>
          </div>
        </Card>

        <Card className="flex items-start gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Low stock items</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {lowStockProducts.length}
            </p>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading inventory snapshot...</Card>
      ) : (
        <div className="space-y-6">
          {products.length === 0 ? (
            <EmptyState
              title="No inventory records yet"
              description="Create products first so stock and movement history can be tracked."
            />
          ) : (
            <Card className="space-y-4">
              <h2 className="text-lg font-semibold text-slate-950">Current stock</h2>
              <DataTable
                columns={productColumns}
                data={products}
                emptyTitle="No products"
                emptyDescription="Products will appear here once created."
              />
            </Card>
          )}

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Recent inventory movements</h2>
            {movements.length === 0 ? (
              <EmptyState
                title="No movement history yet"
                description="Movement rows appear here after online orders, POS sales, or stock actions."
              />
            ) : (
              <DataTable
                columns={movementColumns}
                data={movements}
                emptyTitle="No movement rows"
                emptyDescription="Movement rows appear after inventory changes."
              />
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
