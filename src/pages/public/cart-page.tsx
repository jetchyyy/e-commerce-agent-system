import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { useStorefrontBranding } from '../../features/catalog/use-storefront-branding'
import { useCartStore } from '../../stores/cart-store'
import { formatCurrency } from '../../lib/utils'

export function CartPage() {
  const { content } = useStorefrontBranding()
  const items = useCartStore((state) => state.items)
  const updateQuantity = useCartStore((state) => state.updateQuantity)
  const removeItem = useCartStore((state) => state.removeItem)
  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0)

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={content.cart.eyebrow}
        title={content.cart.title}
        description={content.cart.description}
      />

      {items.length === 0 ? (
        <EmptyState
          title={content.cart.emptyTitle}
          description={content.cart.emptyDescription}
          action={
            <Button asChild variant="secondary">
              <Link to="/shop">{content.cart.continueShoppingLabel}</Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="space-y-4">
            {items.map((item) => (
              <div
                key={item.productId}
                className="flex flex-col gap-4 rounded-3xl border border-slate-100 px-4 py-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>
                  <div>
                    <p className="font-medium text-slate-950">{item.name}</p>
                    <p className="text-sm text-slate-500">{item.sku}</p>
                    <p className="mt-1 text-sm text-slate-700">
                      {formatCurrency(item.price)} each
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(event) =>
                      updateQuantity(item.productId, Number(event.target.value) || 1)
                    }
                    className="w-24"
                  />
                  <p className="w-28 text-right font-semibold text-slate-950">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  <Button variant="ghost" onClick={() => removeItem(item.productId)}>
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </Card>

          <Card className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">{content.cart.summaryTitle}</h2>
              <p className="mt-1 text-sm text-slate-600">
                {content.cart.summaryDescription}
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <div className="flex items-center justify-between">
                <span>Items</span>
                <span>{items.reduce((sum, item) => sum + item.quantity, 0)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Estimated total</span>
                <span className="text-lg font-semibold text-slate-950">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <Button asChild className="w-full">
              <Link to="/checkout">{content.cart.checkoutLabel}</Link>
            </Button>
          </Card>
        </div>
      )}
    </div>
  )
}
