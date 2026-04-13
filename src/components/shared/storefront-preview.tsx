import { ShoppingBag, ShoppingCart, TicketPercent } from 'lucide-react'

import { Card } from '../ui/card'
import { cn } from '../../lib/utils'
import type { StorefrontContent } from '../../lib/storefront-content'

function PreviewImage({
  url,
  alt,
  className,
}: {
  url: string
  alt: string
  className?: string
}) {
  if (url) {
    return <img src={url} alt={alt} className={cn('h-full w-full object-cover', className)} />
  }

  return (
    <div
      className={cn(
        'h-full w-full bg-[radial-gradient(circle_at_top_left,_rgba(249,115,22,0.22),_transparent_32%),linear-gradient(135deg,_#111827_0%,_#334155_52%,_#f97316_100%)]',
        className,
      )}
    />
  )
}

function PreviewShell({
  content,
  children,
}: {
  content: StorefrontContent
  children: React.ReactNode
}) {
  return (
    <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-[#fffdf8] shadow-[0_24px_80px_-50px_rgba(15,23,42,0.35)]">
      <div className="border-b border-slate-200 bg-white px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-slate-500">
          {content.nav.announcement}
        </p>
        <div className="mt-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
              <ShoppingBag className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-slate-950">{content.nav.badgeText}</p>
              <p className="text-xs text-slate-500">{content.nav.brandTagline}</p>
            </div>
          </div>
          <div className="hidden gap-4 text-sm text-slate-600 md:flex">
            <span>Home</span>
            <span>Shop</span>
            <span>Cart</span>
          </div>
        </div>
      </div>
      <div className="space-y-6 p-5">{children}</div>
      <div className="border-t border-slate-200 bg-white px-5 py-4">
        <p className="text-sm font-semibold text-slate-950">{content.footer.heading}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">{content.footer.body}</p>
      </div>
    </div>
  )
}

export function HomePagePreview({ content }: { content: StorefrontContent }) {
  return (
    <PreviewShell content={content}>
      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {content.home.eyebrow}
          </p>
          <h3 className="text-3xl font-semibold leading-tight text-slate-950">
            {content.home.title}
          </h3>
          <p className="text-sm leading-7 text-slate-600">{content.home.description}</p>
          <div className="flex flex-wrap gap-3">
            <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
              {content.home.primaryCtaLabel}
            </span>
            <span className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-900">
              {content.home.secondaryCtaLabel}
            </span>
          </div>
        </div>
        <div className="overflow-hidden rounded-[1.5rem]">
          <PreviewImage
            url={content.home.heroImage.url}
            alt={content.home.heroImage.alt}
            className="aspect-[4/3]"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-slate-200 bg-white/90 shadow-none">
          <p className="text-sm font-semibold text-slate-950">{content.home.featureCardTitle}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{content.home.featureCardBody}</p>
        </Card>
        <Card className="border-slate-200 bg-white/90 shadow-none">
          <p className="text-sm font-semibold text-slate-950">{content.home.storyTitle}</p>
          <p className="mt-2 text-sm leading-7 text-slate-600">{content.home.storyBody}</p>
        </Card>
      </div>
    </PreviewShell>
  )
}

export function ShopPagePreview({ content }: { content: StorefrontContent }) {
  return (
    <PreviewShell content={content}>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {content.shop.eyebrow}
          </p>
          <h3 className="text-3xl font-semibold text-slate-950">{content.shop.title}</h3>
          <p className="text-sm leading-7 text-slate-600">{content.shop.description}</p>
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
            {content.shop.searchPlaceholder}
          </div>
        </div>
        <div className="overflow-hidden rounded-[1.5rem]">
          <PreviewImage
            url={content.shop.heroImage.url}
            alt={content.shop.heroImage.alt}
            className="aspect-[4/3]"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((item) => (
          <Card key={item} className="space-y-3 border-slate-200 bg-white shadow-none">
            <div className="aspect-[4/3] overflow-hidden rounded-[1.25rem]">
              <PreviewImage url="" alt="" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="font-semibold text-slate-950">Drilab Race Jersey {item}</p>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                {content.shop.highlightLabel}
              </span>
            </div>
            <p className="text-sm text-slate-600">Breathable paneling, fast-dry finish, and a clean cycling fit.</p>
          </Card>
        ))}
      </div>
    </PreviewShell>
  )
}

export function ProductPagePreview({ content }: { content: StorefrontContent }) {
  return (
    <PreviewShell content={content}>
      <div className="grid gap-5 lg:grid-cols-[1fr_0.9fr]">
        <div className="overflow-hidden rounded-[1.5rem]">
          <PreviewImage url="" alt="" className="aspect-[4/3]" />
        </div>
        <div className="space-y-4">
          <p className="text-sm font-medium text-slate-500">{content.product.backLabel}</p>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {content.product.eyebrow}
          </p>
          <h3 className="text-3xl font-semibold text-slate-950">Drilab Mesh Training Shorts</h3>
          <p className="text-sm leading-7 text-slate-600">{content.product.descriptionFallback}</p>
          <div className="rounded-3xl bg-slate-50 p-4">
            <p className="text-2xl font-semibold text-slate-950">$49.00</p>
            <p className="mt-1 text-sm text-slate-600">18 {content.product.stockLabel}</p>
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
            {content.product.addToCartLabel}
          </span>
        </div>
      </div>
    </PreviewShell>
  )
}

export function CartPagePreview({ content }: { content: StorefrontContent }) {
  return (
    <PreviewShell content={content}>
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
          {content.cart.eyebrow}
        </p>
        <h3 className="text-3xl font-semibold text-slate-950">{content.cart.title}</h3>
        <p className="text-sm leading-7 text-slate-600">{content.cart.description}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-3">
          {[1, 2].map((item) => (
            <Card key={item} className="flex items-center justify-between gap-4 border-slate-200 bg-white shadow-none">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 overflow-hidden rounded-2xl">
                  <PreviewImage url="" alt="" />
                </div>
                <div>
                  <p className="font-semibold text-slate-950">Drilab Jersey {item}</p>
                  <p className="text-sm text-slate-500">Qty 1</p>
                </div>
              </div>
              <p className="font-semibold text-slate-950">$64.00</p>
            </Card>
          ))}
        </div>
        <Card className="space-y-3 border-slate-200 bg-white shadow-none">
          <p className="text-lg font-semibold text-slate-950">{content.cart.summaryTitle}</p>
          <p className="text-sm leading-7 text-slate-600">{content.cart.summaryDescription}</p>
          <div className="flex items-center justify-between text-sm text-slate-600">
            <span>Estimated total</span>
            <span className="text-lg font-semibold text-slate-950">$128.00</span>
          </div>
          <span className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
            {content.cart.checkoutLabel}
          </span>
        </Card>
      </div>
    </PreviewShell>
  )
}

export function CheckoutPagePreview({ content }: { content: StorefrontContent }) {
  return (
    <PreviewShell content={content}>
      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
            {content.checkout.eyebrow}
          </p>
          <h3 className="text-3xl font-semibold text-slate-950">{content.checkout.title}</h3>
          <p className="text-sm leading-7 text-slate-600">{content.checkout.description}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {['Full name', 'Email', 'Phone', 'Address'].map((label) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500"
              >
                {label}
              </div>
            ))}
          </div>
          <span className="inline-flex items-center rounded-full bg-slate-950 px-4 py-2 text-sm font-medium text-white">
            {content.checkout.submitLabel}
          </span>
        </div>
        <Card className="space-y-4 border-slate-200 bg-white shadow-none">
          <p className="text-lg font-semibold text-slate-950">{content.checkout.summaryTitle}</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Drilab Mesh Shorts</span>
              <span>$49.00</span>
            </div>
            <div className="flex items-center justify-between text-sm text-slate-600">
              <span>Drilab Cycling Jersey</span>
              <span>$79.00</span>
            </div>
          </div>
          <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">
            <p className="font-semibold text-slate-950">{content.checkout.referralLabel}</p>
            <div className="mt-2 flex items-center gap-2">
              <TicketPercent className="h-4 w-4" />
              team-drillab
            </div>
          </div>
          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <span className="text-sm text-slate-600">Total</span>
            <span className="text-lg font-semibold text-slate-950">$128.00</span>
          </div>
        </Card>
      </div>
    </PreviewShell>
  )
}

export function MiniPreviewTabs({
  current,
  onChange,
}: {
  current: string
  onChange: (value: string) => void
}) {
  const tabs = [
    ['home', 'Home'],
    ['shop', 'Shop'],
    ['product', 'Product'],
    ['cart', 'Cart'],
    ['checkout', 'Checkout'],
  ]

  return (
    <div className="flex flex-wrap gap-2">
      {tabs.map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => onChange(value)}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-medium transition',
            current === value
              ? 'bg-slate-950 text-white'
              : 'border border-slate-200 bg-white text-slate-700',
          )}
        >
          {label}
        </button>
      ))}
      <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600">
        <ShoppingCart className="h-4 w-4" />
        Live preview
      </span>
    </div>
  )
}
