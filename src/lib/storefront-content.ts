export interface StorefrontImageSlot {
  url: string
  alt: string
}

export interface StorefrontNavContent {
  announcement: string
  badgeText: string
  brandTagline: string
}

export interface StorefrontFooterContent {
  heading: string
  body: string
  contactLabel: string
}

export interface HomePageContent {
  eyebrow: string
  title: string
  description: string
  primaryCtaLabel: string
  secondaryCtaLabel: string
  featureCardTitle: string
  featureCardBody: string
  heroImage: StorefrontImageSlot
  storyTitle: string
  storyBody: string
}

export interface ShopPageContent {
  eyebrow: string
  title: string
  description: string
  searchPlaceholder: string
  emptyTitle: string
  emptyDescription: string
  highlightLabel: string
  heroImage: StorefrontImageSlot
}

export interface ProductPageContent {
  eyebrow: string
  backLabel: string
  descriptionFallback: string
  stockLabel: string
  addToCartLabel: string
  outOfStockLabel: string
}

export interface CartPageContent {
  eyebrow: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  continueShoppingLabel: string
  summaryTitle: string
  summaryDescription: string
  checkoutLabel: string
}

export interface CheckoutPageContent {
  eyebrow: string
  title: string
  description: string
  emptyTitle: string
  emptyDescription: string
  signInPrompt: string
  signInLabel: string
  submitLabel: string
  submittingLabel: string
  summaryTitle: string
  referralLabel: string
}

export interface StorefrontContent {
  nav: StorefrontNavContent
  footer: StorefrontFooterContent
  home: HomePageContent
  shop: ShopPageContent
  product: ProductPageContent
  cart: CartPageContent
  checkout: CheckoutPageContent
}

export const drilabStorefrontContent: StorefrontContent = {
  nav: {
    announcement: 'Drilab performancewear for riders who train hard and race clean.',
    badgeText: 'Drilab',
    brandTagline: 'Mesh shorts, cycling jerseys, race-day layers, and training essentials.',
  },
  footer: {
    heading: 'Built for heat, speed, and long training blocks.',
    body: 'Drilab focuses on lightweight mesh shorts, aerodynamic jerseys, and durable kit that feels sharp on the bike and comfortable off it.',
    contactLabel: 'Need sizing help or team kit support?',
  },
  home: {
    eyebrow: 'Drilab Cycling Apparel',
    title: 'Performance mesh shorts, cycling jerseys, and training kit tuned for daily riders.',
    description:
      'Launch a storefront that feels like a real performance brand: breathable fabrics, fast-drying racewear, practical training staples, and premium presentation from hero section to checkout.',
    primaryCtaLabel: 'Shop Drilab gear',
    secondaryCtaLabel: 'View featured kits',
    featureCardTitle: 'Cycling-first product storytelling',
    featureCardBody:
      'Highlight breathable mesh shorts, race-fit jerseys, UV layers, and accessories with a premium direct-to-rider tone.',
    heroImage: {
      url: '',
      alt: 'Drilab cycling apparel hero image',
    },
    storyTitle: 'Designed for hot roads, long rides, and repeat training days.',
    storyBody:
      'Use this landing page to position Drilab as a modern cycling brand that balances technical fabrics, functional cuts, and a confident race-inspired visual identity.',
  },
  shop: {
    eyebrow: 'Shop Drilab',
    title: 'Browse jerseys, mesh shorts, base layers, and ride-ready accessories.',
    description:
      'The shop can carry race jerseys, all-day bib alternatives, commuter essentials, and limited drops while keeping filtering, pricing, and inventory tied to live data.',
    searchPlaceholder: 'Search jerseys, mesh shorts, base layers, or keywords',
    emptyTitle: 'No Drilab items match this filter',
    emptyDescription:
      'Adjust your filters or add more cycling products from the admin catalog.',
    highlightLabel: 'Ride-tested picks',
    heroImage: {
      url: '',
      alt: 'Drilab shop banner image',
    },
  },
  product: {
    eyebrow: 'Drilab Product Detail',
    backLabel: 'Back to Drilab shop',
    descriptionFallback: 'No product description has been added for this Drilab item yet.',
    stockLabel: 'available',
    addToCartLabel: 'Add to cart',
    outOfStockLabel: 'Out of stock',
  },
  cart: {
    eyebrow: 'Drilab Cart',
    title: 'Review your kit before heading to checkout.',
    description:
      'Keep the cart clean and confidence-building with a premium summary of the rider’s selected gear.',
    emptyTitle: 'Your Drilab cart is empty',
    emptyDescription:
      'Add mesh shorts, jerseys, or accessories to start building your ride kit.',
    continueShoppingLabel: 'Continue shopping',
    summaryTitle: 'Ride summary',
    summaryDescription: 'Final pricing and stock are confirmed one more time at checkout.',
    checkoutLabel: 'Proceed to secure checkout',
  },
  checkout: {
    eyebrow: 'Drilab Checkout',
    title: 'Complete the order with rider details, delivery info, and one secure submission.',
    description:
      'Shape checkout copy to feel premium and trustworthy while keeping the underlying order logic safe and inventory-aware.',
    emptyTitle: 'Your Drilab cart is empty.',
    emptyDescription: 'Add products before attempting checkout.',
    signInPrompt:
      'Checkout requires a signed-in customer account so the order can be created securely and linked to the rider profile.',
    signInLabel: 'Log in to continue',
    submitLabel: 'Place Drilab order',
    submittingLabel: 'Placing secure order...',
    summaryTitle: 'Order summary',
    referralLabel: 'Referral code',
  },
}

function mergeImageSlot(
  base: StorefrontImageSlot,
  value: unknown,
): StorefrontImageSlot {
  if (!value || typeof value !== 'object') {
    return base
  }

  const candidate = value as Partial<StorefrontImageSlot>

  return {
    url: typeof candidate.url === 'string' ? candidate.url : base.url,
    alt: typeof candidate.alt === 'string' ? candidate.alt : base.alt,
  }
}

function mergeSection<T>(base: T, value: unknown): T {
  if (!value || typeof value !== 'object') {
    return base
  }

  const candidate = value as Record<string, unknown>
  const next = { ...(base as Record<string, unknown>) }

  for (const key of Object.keys(base as Record<string, unknown>)) {
    const baseValue = (base as Record<string, unknown>)[key]
    const candidateValue = candidate[key]

    if (
      baseValue &&
      typeof baseValue === 'object' &&
      !Array.isArray(baseValue) &&
      'url' in (baseValue as Record<string, unknown>) &&
      'alt' in (baseValue as Record<string, unknown>)
    ) {
      next[key] = mergeImageSlot(baseValue as StorefrontImageSlot, candidateValue)
      continue
    }

    if (typeof baseValue === 'string') {
      next[key] = typeof candidateValue === 'string' ? candidateValue : baseValue
    }
  }

  return next as T
}

export function resolveStorefrontContent(
  rawConfig: unknown,
): StorefrontContent {
  const config =
    rawConfig &&
    typeof rawConfig === 'object' &&
    'storefrontContent' in (rawConfig as Record<string, unknown>)
      ? (rawConfig as Record<string, unknown>).storefrontContent
      : rawConfig

  const candidate =
    config && typeof config === 'object'
      ? (config as Record<string, unknown>)
      : {}

  return {
    nav: mergeSection(drilabStorefrontContent.nav, candidate.nav),
    footer: mergeSection(drilabStorefrontContent.footer, candidate.footer),
    home: mergeSection(drilabStorefrontContent.home, candidate.home),
    shop: mergeSection(drilabStorefrontContent.shop, candidate.shop),
    product: mergeSection(drilabStorefrontContent.product, candidate.product),
    cart: mergeSection(drilabStorefrontContent.cart, candidate.cart),
    checkout: mergeSection(drilabStorefrontContent.checkout, candidate.checkout),
  }
}
