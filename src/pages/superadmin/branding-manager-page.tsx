import { useEffect, useMemo, useState, type ChangeEvent } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { Palette, WandSparkles } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { DataTable } from '../../components/shared/data-table'
import { MiniPreviewTabs, HomePagePreview, ShopPagePreview, ProductPagePreview, CartPagePreview, CheckoutPagePreview } from '../../components/shared/storefront-preview'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import {
  fetchBrandingByStore,
  fetchBrandingRecords,
  fetchStores,
  uploadBrandingAsset,
  upsertBranding,
  type StoreBrandingRow,
  type StoreOption,
} from '../../features/auth/superadmin-service'
import {
  drilabStorefrontContent,
  resolveStorefrontContent,
  type StorefrontContent,
} from '../../lib/storefront-content'
import { formatDate } from '../../lib/utils'

const imageSchema = z.object({
  url: z.string().optional(),
  alt: z.string().optional(),
})

const brandingSchema = z.object({
  storeId: z.string().min(1, 'Select a store.'),
  storeName: z.string().min(2, 'Store name is required.'),
  primaryColor: z.string().min(4, 'Primary color is required.'),
  accentColor: z.string().min(4, 'Accent color is required.'),
  supportEmail: z.string().optional(),
  supportPhone: z.string().optional(),
  address: z.string().optional(),
  footerText: z.string().optional(),
  receiptHeader: z.string().optional(),
  receiptFooter: z.string().optional(),
  invoiceNotes: z.string().optional(),
  currencyCode: z.string().min(3, 'Currency code is required.'),
  nav: z.object({
    announcement: z.string().optional(),
    badgeText: z.string().optional(),
    brandTagline: z.string().optional(),
  }),
  footer: z.object({
    heading: z.string().optional(),
    body: z.string().optional(),
    contactLabel: z.string().optional(),
  }),
  home: z.object({
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    primaryCtaLabel: z.string().optional(),
    secondaryCtaLabel: z.string().optional(),
    featureCardTitle: z.string().optional(),
    featureCardBody: z.string().optional(),
    storyTitle: z.string().optional(),
    storyBody: z.string().optional(),
    heroImage: imageSchema,
  }),
  shop: z.object({
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    searchPlaceholder: z.string().optional(),
    emptyTitle: z.string().optional(),
    emptyDescription: z.string().optional(),
    highlightLabel: z.string().optional(),
    heroImage: imageSchema,
  }),
  product: z.object({
    eyebrow: z.string().optional(),
    backLabel: z.string().optional(),
    descriptionFallback: z.string().optional(),
    stockLabel: z.string().optional(),
    addToCartLabel: z.string().optional(),
    outOfStockLabel: z.string().optional(),
  }),
  cart: z.object({
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    emptyTitle: z.string().optional(),
    emptyDescription: z.string().optional(),
    continueShoppingLabel: z.string().optional(),
    summaryTitle: z.string().optional(),
    summaryDescription: z.string().optional(),
    checkoutLabel: z.string().optional(),
  }),
  checkout: z.object({
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    emptyTitle: z.string().optional(),
    emptyDescription: z.string().optional(),
    signInPrompt: z.string().optional(),
    signInLabel: z.string().optional(),
    submitLabel: z.string().optional(),
    submittingLabel: z.string().optional(),
    summaryTitle: z.string().optional(),
    referralLabel: z.string().optional(),
  }),
})

type BrandingValues = z.infer<typeof brandingSchema>

const columns: ColumnDef<StoreBrandingRow>[] = [
  { header: 'Store', accessorKey: 'store_name' },
  {
    header: 'Theme',
    cell: ({ row }) =>
      `${row.original.primary_color} / ${row.original.accent_color}`,
  },
  {
    header: 'Sample page',
    cell: ({ row }) => row.original.storefront_content.home.title,
  },
  {
    header: 'Updated',
    cell: ({ row }) => formatDate(row.original.updated_at),
  },
]

function getDefaultValues(storeId = '', storeName = ''): BrandingValues {
  return {
    storeId,
    storeName,
    primaryColor: '#111827',
    accentColor: '#f97316',
    supportEmail: '',
    supportPhone: '',
    address: '',
    footerText: '',
    receiptHeader: '',
    receiptFooter: '',
    invoiceNotes: '',
    currencyCode: 'PHP',
    nav: { ...drilabStorefrontContent.nav },
    footer: { ...drilabStorefrontContent.footer },
    home: {
      ...drilabStorefrontContent.home,
      heroImage: { ...drilabStorefrontContent.home.heroImage },
    },
    shop: {
      ...drilabStorefrontContent.shop,
      heroImage: { ...drilabStorefrontContent.shop.heroImage },
    },
    product: { ...drilabStorefrontContent.product },
    cart: { ...drilabStorefrontContent.cart },
    checkout: { ...drilabStorefrontContent.checkout },
  }
}

function toFormValues(row: StoreBrandingRow): BrandingValues {
  return {
    storeId: row.store_id,
    storeName: row.store_name,
    primaryColor: row.primary_color,
    accentColor: row.accent_color,
    supportEmail: row.support_email ?? '',
    supportPhone: row.support_phone ?? '',
    address: row.address ?? '',
    footerText: row.footer_text ?? '',
    receiptHeader: row.receipt_header ?? '',
    receiptFooter: row.receipt_footer ?? '',
    invoiceNotes: row.invoice_notes ?? '',
    currencyCode: row.currency_code,
    nav: { ...row.storefront_content.nav },
    footer: { ...row.storefront_content.footer },
    home: {
      ...row.storefront_content.home,
      heroImage: { ...row.storefront_content.home.heroImage },
    },
    shop: {
      ...row.storefront_content.shop,
      heroImage: { ...row.storefront_content.shop.heroImage },
    },
    product: { ...row.storefront_content.product },
    cart: { ...row.storefront_content.cart },
    checkout: { ...row.storefront_content.checkout },
  }
}

export function BrandingManagerPage() {
  const [stores, setStores] = useState<StoreOption[]>([])
  const [records, setRecords] = useState<StoreBrandingRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [previewPage, setPreviewPage] = useState('home')
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null)

  const form = useForm<BrandingValues>({
    resolver: zodResolver(brandingSchema),
    defaultValues: getDefaultValues(),
  })

  async function loadData() {
    setIsLoading(true)

    try {
      const [storeRows, brandingRows] = await Promise.all([
        fetchStores(),
        fetchBrandingRecords(),
      ])

      setStores(storeRows)
      setRecords(brandingRows)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to load storefront records.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function handleStoreChange(storeId: string) {
    form.setValue('storeId', storeId, { shouldValidate: true })

    const selectedStore = stores.find((item) => item.id === storeId)

    if (!selectedStore) {
      return
    }

    try {
      const branding = await fetchBrandingByStore(storeId)

      if (branding) {
        form.reset(toFormValues(branding))
      } else {
        form.reset(getDefaultValues(storeId, selectedStore.name))
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to load the selected storefront content.',
      )
    }
  }

  const watched = form.watch()

  const previewContent = useMemo<StorefrontContent>(
    () =>
      resolveStorefrontContent({
        nav: watched.nav,
        footer: watched.footer,
        home: watched.home,
        shop: watched.shop,
        product: watched.product,
        cart: watched.cart,
        checkout: watched.checkout,
      }),
    [watched],
  )

  const onSubmit = form.handleSubmit(async (values) => {
    setIsSaving(true)

    try {
      await upsertBranding({
        storeId: values.storeId,
        storeName: values.storeName,
        primaryColor: values.primaryColor,
        accentColor: values.accentColor,
        supportEmail: values.supportEmail,
        supportPhone: values.supportPhone,
        address: values.address,
        footerText: values.footerText,
        receiptHeader: values.receiptHeader,
        receiptFooter: values.receiptFooter,
        invoiceNotes: values.invoiceNotes,
        currencyCode: values.currencyCode,
        heroTitle: values.home.title,
        heroSubtitle: values.home.description,
        storefrontContent: previewContent,
      })

      toast.success('Storefront content saved successfully.')
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to save storefront content.',
      )
    } finally {
      setIsSaving(false)
    }
  })

  async function handleImageUpload(
    slot: 'home.heroImage' | 'shop.heroImage',
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0]
    const storeId = form.getValues('storeId')

    if (!file) {
      return
    }

    if (!storeId) {
      toast.error('Select a store before uploading storefront images.')
      event.target.value = ''
      return
    }

    setUploadingSlot(slot)

    try {
      const result = await uploadBrandingAsset({
        storeId,
        file,
        slot,
      })

      form.setValue(`${slot}.url`, result.publicUrl, {
        shouldDirty: true,
        shouldTouch: true,
      })

      if (!form.getValues(`${slot}.alt`)) {
        form.setValue(`${slot}.alt`, file.name.replace(/\.[^/.]+$/, ''), {
          shouldDirty: true,
          shouldTouch: true,
        })
      }

      toast.success('Image uploaded successfully.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to upload branding image.',
      )
    } finally {
      setUploadingSlot(null)
      event.target.value = ''
    }
  }

  function renderPreview() {
    switch (previewPage) {
      case 'shop':
        return <ShopPagePreview content={previewContent} />
      case 'product':
        return <ProductPagePreview content={previewContent} />
      case 'cart':
        return <CartPagePreview content={previewContent} />
      case 'checkout':
        return <CheckoutPagePreview content={previewContent} />
      case 'home':
      default:
        return <HomePagePreview content={previewContent} />
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Storefront Control"
        title="Customize the customer-facing experience from hero copy to checkout language."
        description="This editor gives superadmin control over the storefront voice, page copy, and uploaded imagery with Drilab starter content and a live preview for the main public pages."
      />

      <div className="grid gap-6 xl:grid-cols-[560px_1fr]">
        <Card className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Palette className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Storefront editor
              </h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                Start from Drilab sample content, then tune each public page for your brand.
              </p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Store</label>
                <Select
                  value={form.watch('storeId')}
                  onChange={(event) => void handleStoreChange(event.target.value)}
                >
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.slug})
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-rose-600">
                  {form.formState.errors.storeId?.message}
                </p>
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Store name</label>
                <Input {...form.register('storeName')} />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Primary color</label>
                <Input {...form.register('primaryColor')} />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">Accent color</label>
                <Input {...form.register('accentColor')} />
              </div>
            </div>

            <Card className="space-y-4 border-slate-200 bg-slate-50 shadow-none">
              <h3 className="text-base font-semibold text-slate-950">Navigation and footer</h3>
              <Input {...form.register('nav.badgeText')} placeholder="Brand name" />
              <Textarea {...form.register('nav.brandTagline')} placeholder="Brand tagline" />
              <Textarea {...form.register('nav.announcement')} placeholder="Top announcement" />
              <Input {...form.register('footer.heading')} placeholder="Footer heading" />
              <Textarea {...form.register('footer.body')} placeholder="Footer body" />
              <Input {...form.register('footer.contactLabel')} placeholder="Footer contact line" />
            </Card>

            <Card className="space-y-4 border-slate-200 bg-slate-50 shadow-none">
              <h3 className="text-base font-semibold text-slate-950">Home page</h3>
              <Input {...form.register('home.eyebrow')} placeholder="Eyebrow" />
              <Input {...form.register('home.title')} placeholder="Hero title" />
              <Textarea {...form.register('home.description')} placeholder="Hero description" />
              <div className="grid gap-4 md:grid-cols-2">
                <Input {...form.register('home.primaryCtaLabel')} placeholder="Primary CTA" />
                <Input {...form.register('home.secondaryCtaLabel')} placeholder="Secondary CTA" />
              </div>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Upload home hero image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleImageUpload('home.heroImage', event)}
                />
                <p className="text-xs text-slate-500">
                  {uploadingSlot === 'home.heroImage'
                    ? 'Uploading image...'
                    : watched.home?.heroImage?.url || 'No image uploaded yet.'}
                </p>
              </div>
              <Input {...form.register('home.heroImage.alt')} placeholder="Hero image alt text" />
              <Input {...form.register('home.featureCardTitle')} placeholder="Feature card title" />
              <Textarea {...form.register('home.featureCardBody')} placeholder="Feature card body" />
              <Input {...form.register('home.storyTitle')} placeholder="Story title" />
              <Textarea {...form.register('home.storyBody')} placeholder="Story body" />
            </Card>

            <Card className="space-y-4 border-slate-200 bg-slate-50 shadow-none">
              <h3 className="text-base font-semibold text-slate-950">Shop page</h3>
              <Input {...form.register('shop.eyebrow')} placeholder="Eyebrow" />
              <Input {...form.register('shop.title')} placeholder="Page title" />
              <Textarea {...form.register('shop.description')} placeholder="Page description" />
              <Input {...form.register('shop.searchPlaceholder')} placeholder="Search placeholder" />
              <Input {...form.register('shop.highlightLabel')} placeholder="Highlight badge text" />
              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Upload shop hero image</label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(event) => void handleImageUpload('shop.heroImage', event)}
                />
                <p className="text-xs text-slate-500">
                  {uploadingSlot === 'shop.heroImage'
                    ? 'Uploading image...'
                    : watched.shop?.heroImage?.url || 'No image uploaded yet.'}
                </p>
              </div>
              <Input {...form.register('shop.heroImage.alt')} placeholder="Shop hero image alt text" />
              <Input {...form.register('shop.emptyTitle')} placeholder="Empty state title" />
              <Textarea {...form.register('shop.emptyDescription')} placeholder="Empty state description" />
            </Card>

            <Card className="space-y-4 border-slate-200 bg-slate-50 shadow-none">
              <h3 className="text-base font-semibold text-slate-950">Product, cart, and checkout</h3>
              <Input {...form.register('product.eyebrow')} placeholder="Product eyebrow" />
              <Input {...form.register('product.backLabel')} placeholder="Back label" />
              <Textarea {...form.register('product.descriptionFallback')} placeholder="Product fallback description" />
              <div className="grid gap-4 md:grid-cols-2">
                <Input {...form.register('product.addToCartLabel')} placeholder="Add to cart label" />
                <Input {...form.register('product.outOfStockLabel')} placeholder="Out of stock label" />
              </div>
              <Input {...form.register('cart.title')} placeholder="Cart title" />
              <Textarea {...form.register('cart.description')} placeholder="Cart description" />
              <Input {...form.register('cart.checkoutLabel')} placeholder="Cart checkout button label" />
              <Input {...form.register('checkout.title')} placeholder="Checkout title" />
              <Textarea {...form.register('checkout.description')} placeholder="Checkout description" />
              <Input {...form.register('checkout.signInLabel')} placeholder="Checkout sign-in CTA" />
              <div className="grid gap-4 md:grid-cols-2">
                <Input {...form.register('checkout.submitLabel')} placeholder="Checkout submit label" />
                <Input {...form.register('checkout.submittingLabel')} placeholder="Checkout submitting label" />
              </div>
              <Input {...form.register('checkout.summaryTitle')} placeholder="Checkout summary title" />
              <Input {...form.register('checkout.referralLabel')} placeholder="Referral label" />
            </Card>

            <Card className="space-y-4 border-slate-200 bg-slate-50 shadow-none">
              <h3 className="text-base font-semibold text-slate-950">Business details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <Input {...form.register('supportEmail')} placeholder="Support email" />
                <Input {...form.register('supportPhone')} placeholder="Support phone" />
              </div>
              <Textarea {...form.register('address')} placeholder="Address" />
              <Textarea {...form.register('footerText')} placeholder="Receipt/footer legal text" />
              <Textarea {...form.register('receiptHeader')} placeholder="Receipt header" />
              <Textarea {...form.register('receiptFooter')} placeholder="Receipt footer" />
              <Textarea {...form.register('invoiceNotes')} placeholder="Invoice notes" />
              <Input {...form.register('currencyCode')} placeholder="Currency code" />
            </Card>

            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? 'Saving storefront...' : 'Save storefront content'}
            </Button>
          </form>
        </Card>

        <div className="space-y-6">
          <Card className="space-y-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                <WandSparkles className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Live preview</h2>
                <p className="mt-1 text-sm leading-7 text-slate-600">
                  Preview the current copy and image choices without leaving the superadmin workspace.
                </p>
              </div>
            </div>

            <MiniPreviewTabs current={previewPage} onChange={setPreviewPage} />
            {renderPreview()}
          </Card>

          <Card className="space-y-5">
            <h2 className="text-lg font-semibold text-slate-950">Configured storefront records</h2>
            {isLoading ? (
              <Card className="border-dashed text-sm text-slate-600">
                Loading storefront records...
              </Card>
            ) : (
              <DataTable
                columns={columns}
                data={records}
                emptyTitle="No storefront records yet"
                emptyDescription="Save the first Drilab-style storefront configuration to personalize the customer pages."
              />
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}
