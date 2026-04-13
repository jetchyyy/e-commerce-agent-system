import { useEffect, useMemo, useState } from 'react'
import { Search, ShoppingCart } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { fetchCategories, fetchProducts } from '../../features/catalog/catalog-service'
import { useStorefrontBranding } from '../../features/catalog/use-storefront-branding'
import { useCartStore } from '../../stores/cart-store'
import type { Category, Product } from '../../types/domain'
import { formatCurrency } from '../../lib/utils'

export function ShopPage() {
  const { content } = useStorefrontBranding()
  const [searchParams, setSearchParams] = useSearchParams()
  const addItem = useCartStore((state) => state.addItem)
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''

  useEffect(() => {
    async function loadStorefront() {
      setIsLoading(true)
      try {
        const [categoryRows, productRows] = await Promise.all([
          fetchCategories(),
          fetchProducts(),
        ])
        setCategories(categoryRows)
        setProducts(productRows.filter((product) => product.is_available))
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Unable to load storefront products.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadStorefront()
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        !search ||
        [product.name, product.sku, product.short_description, product.description]
          .filter(Boolean)
          .some((value) =>
            String(value).toLowerCase().includes(search.toLowerCase()),
          )

      const matchesCategory =
        !category ||
        categories.find((item) => item.id === product.category_id)?.slug === category

      return matchesSearch && matchesCategory
    })
  }, [categories, category, products, search])

  function updateSearchParam(name: string, value: string) {
    const next = new URLSearchParams(searchParams)
    if (value) {
      next.set(name, value)
    } else {
      next.delete(name)
    }
    setSearchParams(next)
  }

  function handleAddToCart(product: Product) {
    addItem(product)
    toast.success(`${product.name} added to cart.`)
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={content.shop.eyebrow}
        title={content.shop.title}
        description={content.shop.description}
      />

      {content.shop.heroImage.url ? (
        <Card className="overflow-hidden p-0">
          <div className="aspect-[5/2] bg-slate-100">
            <img
              src={content.shop.heroImage.url}
              alt={content.shop.heroImage.alt}
              className="h-full w-full object-cover"
            />
          </div>
        </Card>
      ) : null}

      <Card className="grid gap-4 md:grid-cols-[1fr_280px]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
          <Input
            className="pl-11"
            placeholder={content.shop.searchPlaceholder}
            value={search}
            onChange={(event) => updateSearchParam('search', event.target.value)}
          />
        </label>

        <Select
          value={category}
          onChange={(event) => updateSearchParam('category', event.target.value)}
        >
          <option value="">All categories</option>
          {categories.map((item) => (
            <option key={item.id} value={item.slug}>
              {item.name}
            </option>
          ))}
        </Select>
      </Card>

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading live catalog...</Card>
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          title={content.shop.emptyTitle}
          description={content.shop.emptyDescription}
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="flex h-full flex-col overflow-hidden p-0">
              <div className="aspect-[4/3] bg-[linear-gradient(135deg,_#f8fafc_0%,_#fff7ed_100%)]">
                {product.image_urls[0] ? (
                  <img
                    src={product.image_urls[0]}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                ) : null}
              </div>

              <div className="flex flex-1 flex-col gap-4 p-6">
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      to={`/products/${product.slug}`}
                      className="text-lg font-semibold text-slate-950 hover:text-slate-700"
                    >
                      {product.name}
                    </Link>
                    {product.is_featured ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                        Featured
                      </span>
                    ) : null}
                  </div>

                  <p className="text-sm leading-7 text-slate-600">
                    {product.short_description || product.description || 'No description yet.'}
                  </p>
                </div>

                <div className="mt-auto space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">
                        {formatCurrency(product.sale_price ?? product.price)}
                      </p>
                      {product.sale_price ? (
                        <p className="text-sm text-slate-500 line-through">
                          {formatCurrency(product.price)}
                        </p>
                      ) : null}
                    </div>
                    <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                      {product.track_inventory
                        ? `${product.stock_quantity} in stock`
                        : 'Inventory off'}
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button asChild variant="secondary" className="flex-1">
                      <Link to={`/products/${product.slug}`}>View details</Link>
                    </Button>
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => handleAddToCart(product)}
                      disabled={product.track_inventory && product.stock_quantity <= 0}
                    >
                      <ShoppingCart className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
