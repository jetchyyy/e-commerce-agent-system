import { useEffect, useMemo, useState } from 'react'
import { Calculator, Plus, ScanSearch, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { fetchAdminProducts } from '../../features/catalog/admin-catalog-service'
import { completePosSale } from '../../features/orders/order-service'
import { useAuthStore } from '../../stores/auth-store'
import type { Product } from '../../types/domain'
import { formatCurrency } from '../../lib/utils'

interface PosLine {
  productId: string
  name: string
  sku: string
  quantity: number
  price: number
}

export function PosPage() {
  const profile = useAuthStore((state) => state.profile)
  const [products, setProducts] = useState<Product[]>([])
  const [cart, setCart] = useState<PosLine[]>([])
  const [search, setSearch] = useState('')
  const [cashReceived, setCashReceived] = useState('')
  const [notes, setNotes] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function loadProducts() {
      if (!profile?.store_id) {
        setProducts([])
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const rows = await fetchAdminProducts(profile.store_id)
        setProducts(rows.filter((product) => !product.archived_at && product.is_available))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load POS catalog.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadProducts()
  }, [profile?.store_id])

  const filteredProducts = useMemo(() => {
    return products.filter((product) =>
      [product.name, product.sku, product.short_description]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search.toLowerCase())),
    )
  }, [products, search])

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const changeDue = Math.max((Number(cashReceived) || 0) - subtotal, 0)

  function addToCart(product: Product) {
    const price = product.sale_price ?? product.price

    setCart((current) => {
      const existing = current.find((item) => item.productId === product.id)
      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        )
      }

      return [
        ...current,
        {
          productId: product.id,
          name: product.name,
          sku: product.sku,
          quantity: 1,
          price,
        },
      ]
    })
  }

  function updateQuantity(productId: string, quantity: number) {
    setCart((current) =>
      current
        .map((item) => (item.productId === productId ? { ...item, quantity } : item))
        .filter((item) => item.quantity > 0),
    )
  }

  async function handleCompleteSale() {
    if (!profile?.store_id || !profile.id) {
      toast.error('This admin account is not attached to a store.')
      return
    }

    if (cart.length === 0) {
      toast.error('Add at least one item to the POS cart.')
      return
    }

    const cash = Number(cashReceived)
    if (!Number.isFinite(cash) || cash < subtotal) {
      toast.error('Cash received must cover the sale total.')
      return
    }

    setIsSubmitting(true)
    try {
      const result = await completePosSale({
        storeId: profile.store_id,
        cashierId: profile.id,
        items: cart.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
        cashReceived: cash,
        idempotencyKey: crypto.randomUUID(),
        notes: notes || undefined,
      })

      toast.success(`POS sale completed. Receipt ${result?.receipt_number ?? ''}`)
      setCart([])
      setCashReceived('')
      setNotes('')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to complete POS sale.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Walk-in POS"
        title="Fast cashier flow backed by the same inventory safety as online checkout."
        description="POS and online checkout both deduct stock through atomic database functions, so cash sales and customer orders cannot oversell each other."
      />

      {!profile?.store_id ? (
        <EmptyState
          title="No store assigned"
          description="Attach this admin account to a store before using the POS."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="space-y-4">
            <label className="relative block">
              <ScanSearch className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
              <Input
                className="pl-11"
                placeholder="Search products by name, SKU, or barcode"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>

            {isLoading ? (
              <Card className="text-sm text-slate-600">Loading POS catalog...</Card>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                title="No products found"
                description="Adjust the search or create products in the admin catalog."
              />
            ) : (
              <div className="grid gap-3 md:grid-cols-2">
                {filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => addToCart(product)}
                    className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-400"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{product.name}</p>
                        <p className="text-sm text-slate-500">{product.sku}</p>
                      </div>
                      <Plus className="h-4 w-4 text-slate-500" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm text-slate-700">
                      <span>{formatCurrency(product.sale_price ?? product.price)}</span>
                      <span>
                        {product.track_inventory
                          ? `${product.stock_quantity} in stock`
                          : 'No tracking'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100">
                <Calculator className="h-5 w-5 text-slate-700" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">POS summary</h2>
                <p className="text-sm text-slate-600">
                  Cash-only checkout with receipt creation and stock deduction.
                </p>
              </div>
            </div>

            {cart.length === 0 ? (
              <p className="text-sm text-slate-600">
                Select products from the left to build the POS cart.
              </p>
            ) : (
              <div className="space-y-3">
                {cart.map((item) => (
                  <div
                    key={item.productId}
                    className="rounded-2xl border border-slate-100 px-4 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-950">{item.name}</p>
                        <p className="text-sm text-slate-500">{item.sku}</p>
                      </div>
                      <Button variant="ghost" onClick={() => updateQuantity(item.productId, 0)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <Input
                        type="number"
                        min={1}
                        className="w-24"
                        value={item.quantity}
                        onChange={(event) =>
                          updateQuantity(item.productId, Number(event.target.value) || 1)
                        }
                      />
                      <p className="font-semibold text-slate-950">
                        {formatCurrency(item.price * item.quantity)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-3 border-t border-slate-100 pt-4 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Total</span>
                <span className="text-lg font-semibold text-slate-950">
                  {formatCurrency(subtotal)}
                </span>
              </div>
              <div>
                <label className="mb-2 block font-medium text-slate-700">Cash received</label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={cashReceived}
                  onChange={(event) => setCashReceived(event.target.value)}
                />
              </div>
              <div>
                <label className="mb-2 block font-medium text-slate-700">Notes</label>
                <Input value={notes} onChange={(event) => setNotes(event.target.value)} />
              </div>
              <div className="flex items-center justify-between">
                <span>Change due</span>
                <span className="font-semibold text-slate-950">
                  {formatCurrency(changeDue)}
                </span>
              </div>
            </div>

            <Button
              className="w-full"
              disabled={isSubmitting || cart.length === 0}
              onClick={() => void handleCompleteSale()}
            >
              {isSubmitting ? 'Completing sale...' : 'Complete safe POS sale'}
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
