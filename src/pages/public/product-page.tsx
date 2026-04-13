import { useEffect, useState } from 'react'
import { ArrowLeft, ShoppingCart } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { fetchProductBySlug } from '../../features/operations/operations-service'
import { useStorefrontBranding } from '../../features/catalog/use-storefront-branding'
import { useCartStore } from '../../stores/cart-store'
import { formatCurrency } from '../../lib/utils'

export function ProductPage() {
  const { content } = useStorefrontBranding()
  const { slug } = useParams()
  const addItem = useCartStore((state) => state.addItem)
  const [product, setProduct] = useState<Awaited<ReturnType<typeof fetchProductBySlug>>>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadProduct() {
      if (!slug) {
        setProduct(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        setProduct(await fetchProductBySlug(slug))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load product.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadProduct()
  }, [slug])

  if (isLoading) {
    return <Card className="text-sm text-slate-600">Loading product...</Card>
  }

  if (!product) {
    return (
      <EmptyState
        title="Product not found"
        description="This product may be archived, unavailable, or the link may be outdated."
        action={
          <Button asChild variant="secondary">
            <Link to="/shop">Back to shop</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
      <Card className="overflow-hidden p-0">
        <div className="aspect-[4/3] bg-[linear-gradient(135deg,_#f8fafc_0%,_#fff7ed_100%)]">
          {product.image_urls[0] ? (
            <img
              src={product.image_urls[0]}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      </Card>

      <div className="space-y-6">
        <Button asChild variant="ghost" className="w-fit gap-2 px-0">
          <Link to="/shop">
            <ArrowLeft className="h-4 w-4" />
            {content.product.backLabel}
          </Link>
        </Button>

        <PageHeader
          eyebrow={content.product.eyebrow}
          title={product.name}
          description={
            product.short_description ||
            product.description ||
            content.product.descriptionFallback
          }
        />

        <Card className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-2xl font-semibold text-slate-950">
                {formatCurrency(product.sale_price ?? product.price)}
              </p>
              {product.sale_price ? (
                <p className="text-sm text-slate-500 line-through">
                  {formatCurrency(product.price)}
                </p>
              ) : null}
            </div>

            <div className="text-right text-sm text-slate-600">
              <p>SKU: {product.sku}</p>
              <p>
                {product.track_inventory
                  ? `${product.stock_quantity} ${content.product.stockLabel}`
                  : 'Inventory tracking disabled'}
              </p>
            </div>
          </div>

          {product.description ? (
            <div className="rounded-3xl bg-slate-50 p-5 text-sm leading-7 text-slate-700">
              {product.description}
            </div>
          ) : null}

          <Button
            className="w-full gap-2"
            onClick={() => {
              addItem(product)
              toast.success(`${product.name} added to cart.`)
            }}
            disabled={product.track_inventory && product.stock_quantity <= 0}
          >
            <ShoppingCart className="h-4 w-4" />
            {product.track_inventory && product.stock_quantity <= 0
              ? content.product.outOfStockLabel
              : content.product.addToCartLabel}
          </Button>
        </Card>
      </div>
    </div>
  )
}
