import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { ImagePlus, Package, PencilLine } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { DataTable } from '../../components/shared/data-table'
import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import {
  archiveProduct,
  createProduct,
  fetchAdminCategories,
  fetchAdminProducts,
  updateProduct,
  uploadProductAsset,
} from '../../features/catalog/admin-catalog-service'
import { useAuthStore } from '../../stores/auth-store'
import type { Category, Product } from '../../types/domain'
import { formatCurrency, formatDate } from '../../lib/utils'

const productSchema = z
  .object({
    name: z.string().min(2, 'Product name is required.'),
    slug: z.string().optional(),
    sku: z.string().min(2, 'SKU is required.'),
    categoryId: z.string().optional(),
    shortDescription: z.string().optional(),
    description: z.string().optional(),
    price: z.coerce.number().min(0, 'Price must be zero or greater.'),
    salePrice: z.preprocess(
      (value) => {
        if (value === '' || value === null || value === undefined) {
          return undefined
        }

        return value
      },
      z.coerce.number().min(0, 'Sale price must be zero or greater.').optional(),
    ),
    stockQuantity: z.coerce
      .number()
      .int('Stock must be a whole number.')
      .min(0, 'Stock must be zero or greater.'),
    isOnSale: z.boolean(),
    isAvailable: z.boolean(),
    trackInventory: z.boolean(),
    isFeatured: z.boolean(),
  })
  .refine((values) => values.salePrice === undefined || values.salePrice <= values.price, {
    message: 'Sale price must be less than or equal to the regular price.',
    path: ['salePrice'],
  })

type ProductFormValues = z.input<typeof productSchema>
type ProductValues = z.output<typeof productSchema>

const columns: ColumnDef<Product>[] = [
  {
    header: 'Product',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-950">{row.original.name}</p>
        <p className="text-xs text-slate-500">{row.original.slug}</p>
      </div>
    ),
  },
  {
    header: 'SKU',
    accessorKey: 'sku',
  },
  {
    header: 'Price',
    cell: ({ row }) => formatCurrency(row.original.sale_price ?? row.original.price),
  },
  {
    header: 'Stock',
    accessorKey: 'stock_quantity',
  },
  {
    header: 'Status',
    cell: ({ row }) =>
      row.original.archived_at
        ? 'Archived'
        : row.original.is_available
          ? 'Visible'
          : 'Hidden',
  },
  {
    header: 'Updated',
    cell: ({ row }) => formatDate(row.original.updated_at),
  },
]

export function ProductsPage() {
  const profile = useAuthStore((state) => state.profile)
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [productImages, setProductImages] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [uploadingSlot, setUploadingSlot] = useState<number | null>(null)

  const form = useForm<ProductFormValues, undefined, ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      slug: '',
      sku: '',
      categoryId: '',
      shortDescription: '',
      description: '',
      price: 0,
      salePrice: undefined,
      stockQuantity: 0,
      isOnSale: false,
      isAvailable: true,
      trackInventory: true,
      isFeatured: false,
    },
  })

  const loadData = useCallback(async () => {
    if (!profile?.store_id) {
      setProducts([])
      setCategories([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)

    try {
      const [productRows, categoryRows] = await Promise.all([
        fetchAdminProducts(profile.store_id),
        fetchAdminCategories(profile.store_id),
      ])

      setProducts(productRows)
      setCategories(categoryRows.filter((category) => category.is_active !== false))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to load products.',
      )
    } finally {
      setIsLoading(false)
    }
  }, [profile?.store_id])

  useEffect(() => {
    void loadData()
  }, [loadData])

  function resetForm() {
    setSelectedProduct(null)
    setProductImages([])
    form.reset({
      name: '',
      slug: '',
      sku: '',
      categoryId: '',
      shortDescription: '',
      description: '',
      price: 0,
      salePrice: undefined,
      stockQuantity: 0,
      isOnSale: false,
      isAvailable: true,
      trackInventory: true,
      isFeatured: false,
    })
  }

  function startEditing(product: Product) {
    setSelectedProduct(product)
    setProductImages(product.image_urls.slice(0, 4))
    form.reset({
      name: product.name,
      slug: product.slug,
      sku: product.sku,
      categoryId: product.category_id ?? '',
      shortDescription: product.short_description ?? '',
      description: product.description ?? '',
      price: product.price,
      salePrice: product.sale_price ?? undefined,
      stockQuantity: product.stock_quantity,
      isOnSale: product.is_on_sale,
      isAvailable: product.is_available,
      trackInventory: product.track_inventory,
      isFeatured: product.is_featured,
    })
  }

  const categoryNameMap = useMemo(
    () =>
      new Map(categories.map((category) => [category.id, category.name] as const)),
    [categories],
  )

  const onSubmit = form.handleSubmit(async (values) => {
    if (!profile?.store_id) {
      toast.error('This admin account is not attached to a store.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        storeId: profile.store_id,
        name: values.name,
        slug: values.slug,
        sku: values.sku,
        categoryId: values.categoryId || null,
        shortDescription: values.shortDescription,
        description: values.description,
        price: values.price,
        salePrice: values.isOnSale ? values.salePrice ?? null : null,
        isOnSale: values.isOnSale,
        stockQuantity: values.stockQuantity,
        isAvailable: values.isAvailable,
        trackInventory: values.trackInventory,
        isFeatured: values.isFeatured,
        imageUrls: productImages,
      }

      if (selectedProduct) {
        await updateProduct(selectedProduct.id, payload)
        toast.success('Product updated successfully.')
      } else {
        await createProduct(payload)
        toast.success('Product created successfully.')
      }

      resetForm()
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to save product.',
      )
    } finally {
      setIsSubmitting(false)
    }
  })

  async function handleArchive() {
    if (!selectedProduct) {
      return
    }

    setIsArchiving(true)

    try {
      await archiveProduct(selectedProduct.id)
      toast.success('Product archived successfully.')
      resetForm()
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to archive product.',
      )
    } finally {
      setIsArchiving(false)
    }
  }

  async function handleImageUpload(slot: number, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    if (!profile?.store_id) {
      toast.error('This admin account is not attached to a store.')
      event.target.value = ''
      return
    }

    setUploadingSlot(slot)

    try {
      const result = await uploadProductAsset({
        storeId: profile.store_id,
        file,
        slot,
      })

      setProductImages((current) => {
        const next = [...current]
        next[slot] = result.publicUrl
        return next.slice(0, 4)
      })

      toast.success(`Image ${slot + 1} uploaded successfully.`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to upload product image.',
      )
    } finally {
      setUploadingSlot(null)
      event.target.value = ''
    }
  }

  function removeImage(slot: number) {
    setProductImages((current) => {
      const next = [...current]
      next.splice(slot, 1)
      return next
    })
  }

  const previewProduct = {
    name: form.watch('name') || 'Drilab Performance Jersey',
    shortDescription:
      form.watch('shortDescription') ||
      form.watch('description') ||
      'Breathable training kit with a clean storefront presentation.',
    price: Number(form.watch('price') || 0),
    salePrice:
      form.watch('isOnSale') && form.watch('salePrice') !== undefined
        ? Number(form.watch('salePrice'))
        : null,
    isFeatured: form.watch('isFeatured'),
    stockQuantity: form.watch('stockQuantity') || 0,
    trackInventory: form.watch('trackInventory'),
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Catalog"
        title="Manage real products for the assigned store."
        description="The store owner/admin can now create, edit, and archive products with pricing, stock, storefront visibility, and up to four uploaded product images."
      />

      {!profile?.store_id ? (
        <EmptyState
          title="No store is assigned to this admin"
          description="Attach this admin account to a store before managing products."
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[520px_1fr]">
          <Card className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <Package className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">
                  {selectedProduct ? 'Edit product' : 'Create product'}
                </h2>
                <p className="mt-1 text-sm leading-7 text-slate-600">
                  Build each product with practical catalog details and storefront-ready imagery.
                </p>
              </div>
            </div>

            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Product name
                </label>
                <Input {...form.register('name')} />
                <p className="mt-1 text-xs text-rose-600">
                  {form.formState.errors.name?.message}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    SKU
                  </label>
                  <Input {...form.register('sku')} />
                  <p className="mt-1 text-xs text-rose-600">
                    {form.formState.errors.sku?.message}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Slug
                  </label>
                  <Input {...form.register('slug')} placeholder="optional-generated-if-empty" />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Category
                </label>
                <Select {...form.register('categoryId')}>
                  <option value="">No category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Short description
                </label>
                <Textarea {...form.register('shortDescription')} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full description
                </label>
                <Textarea {...form.register('description')} />
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                    <ImagePlus className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-950">Product images</h3>
                    <p className="text-sm leading-7 text-slate-600">
                      Upload up to 4 images. The first image becomes the shop card thumbnail.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Card
                      key={index}
                      className="space-y-3 border-slate-200 bg-slate-50 p-4 shadow-none"
                    >
                      <p className="text-sm font-medium text-slate-700">Image {index + 1}</p>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(event) => void handleImageUpload(index, event)}
                      />
                      <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-white">
                        {productImages[index] ? (
                          <img
                            src={productImages[index]}
                            alt={`Product image ${index + 1}`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-xs text-slate-400">
                            {uploadingSlot === index ? 'Uploading...' : 'No image yet'}
                          </div>
                        )}
                      </div>
                      {productImages[index] ? (
                        <Button
                          type="button"
                          variant="ghost"
                          className="w-full"
                          onClick={() => removeImage(index)}
                        >
                          Remove image
                        </Button>
                      ) : null}
                    </Card>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Price
                  </label>
                  <Input type="number" step="0.01" {...form.register('price')} />
                  <p className="mt-1 text-xs text-rose-600">
                    {form.formState.errors.price?.message}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Sale price
                  </label>
                  <Input type="number" step="0.01" {...form.register('salePrice')} />
                  <p className="mt-1 text-xs text-rose-600">
                    {form.formState.errors.salePrice?.message}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">
                    Stock
                  </label>
                  <Input type="number" step="1" {...form.register('stockQuantity')} />
                  <p className="mt-1 text-xs text-rose-600">
                    {form.formState.errors.stockQuantity?.message}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" {...form.register('isOnSale')} />
                  Enable sale pricing
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" {...form.register('isAvailable')} />
                  Visible in storefront
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" {...form.register('trackInventory')} />
                  Track inventory
                </label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                  <input type="checkbox" {...form.register('isFeatured')} />
                  Featured product
                </label>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? selectedProduct
                      ? 'Saving...'
                      : 'Creating...'
                    : selectedProduct
                      ? 'Save changes'
                      : 'Create product'}
                </Button>
                {selectedProduct ? (
                  <>
                    <Button type="button" variant="secondary" onClick={resetForm}>
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={() => void handleArchive()}
                      disabled={isArchiving}
                    >
                      {isArchiving ? 'Archiving...' : 'Archive product'}
                    </Button>
                  </>
                ) : null}
              </div>
            </form>
          </Card>

          <div className="space-y-6">
            <Card className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <PencilLine className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Shop card preview
                  </h2>
                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    This is how the current product draft will look in the shop page grid.
                  </p>
                </div>
              </div>

              <Card className="flex h-full flex-col overflow-hidden p-0">
                <div className="aspect-[4/3] bg-[linear-gradient(135deg,_#f8fafc_0%,_#fff7ed_100%)]">
                  {productImages[0] ? (
                    <img
                      src={productImages[0]}
                      alt={previewProduct.name}
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>

                <div className="flex flex-1 flex-col gap-4 p-6">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-lg font-semibold text-slate-950">
                        {previewProduct.name}
                      </p>
                      {previewProduct.isFeatured ? (
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                          Featured
                        </span>
                      ) : null}
                    </div>

                    <p className="text-sm leading-7 text-slate-600">
                      {previewProduct.shortDescription}
                    </p>
                  </div>

                  <div className="mt-auto space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-lg font-semibold text-slate-950">
                          {formatCurrency(previewProduct.salePrice ?? previewProduct.price)}
                        </p>
                        {previewProduct.salePrice ? (
                          <p className="text-sm text-slate-500 line-through">
                            {formatCurrency(previewProduct.price)}
                          </p>
                        ) : null}
                      </div>
                      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                        {previewProduct.trackInventory
                          ? `${previewProduct.stockQuantity} in stock`
                          : 'Inventory off'}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <Button type="button" variant="secondary" className="flex-1">
                        View details
                      </Button>
                      <Button type="button" className="flex-1">
                        Add
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </Card>

            <Card className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <PencilLine className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">
                    Current products
                  </h2>
                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    Select any product below to edit it. Archived products remain in the list for visibility but are hidden from the storefront.
                  </p>
                </div>
              </div>

              {isLoading ? (
                <Card className="border-dashed text-sm text-slate-600">
                  Loading products...
                </Card>
              ) : products.length === 0 ? (
                <EmptyState
                  title="No products yet"
                  description="Create the first product so the storefront and POS can begin using real inventory."
                />
              ) : (
                <div className="space-y-4">
                  <DataTable
                    columns={columns}
                    data={products}
                    emptyTitle="No products yet"
                    emptyDescription="Create the first product to get started."
                  />
                  <div className="grid gap-3 md:grid-cols-2">
                    {products.map((product) => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => startEditing(product)}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm transition hover:border-slate-400"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-950">{product.name}</p>
                          <span className="text-xs text-slate-500">
                            {formatCurrency(product.sale_price ?? product.price)}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-500">{product.sku}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {product.category_id
                            ? categoryNameMap.get(product.category_id) ?? 'Category not found'
                            : 'No category'}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
