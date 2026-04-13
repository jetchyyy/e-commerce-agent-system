import type { HTMLAttributes } from 'react'

import { cn } from '../../lib/utils'

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-3xl border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_-40px_rgba(15,23,42,0.35)] backdrop-blur',
        className,
      )}
      {...props}
    />
  )
}
