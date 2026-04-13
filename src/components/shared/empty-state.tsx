import type { ReactNode } from 'react'
import { Boxes } from 'lucide-react'

import { Card } from '../ui/card'

interface EmptyStateProps {
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <Card className="flex flex-col items-start gap-4 border-dashed">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
        <Boxes className="h-5 w-5" />
      </span>
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="max-w-2xl text-sm leading-7 text-slate-600">
          {description}
        </p>
      </div>
      {action}
    </Card>
  )
}
