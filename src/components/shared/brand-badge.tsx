import { Store, WandSparkles } from 'lucide-react'

import { useStorefrontBranding } from '../../features/catalog/use-storefront-branding'
import { Card } from '../ui/card'

export function BrandBadge() {
  const { content } = useStorefrontBranding()

  return (
    <Card className="inline-flex items-center gap-3 rounded-full border-slate-200/80 px-4 py-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
        <Store className="h-5 w-5" />
      </span>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
          {content.nav.badgeText}
        </p>
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          {content.nav.brandTagline}
          <WandSparkles className="h-4 w-4 text-amber-600" />
        </p>
      </div>
    </Card>
  )
}
