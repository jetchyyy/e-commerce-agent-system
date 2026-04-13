import type { DashboardStat } from '../../types/domain'
import { Card } from '../ui/card'

export function StatCard({ label, value, helper }: DashboardStat) {
  return (
    <Card className="space-y-3">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-3xl font-semibold tracking-tight text-slate-950">
        {value}
      </p>
      <p className="text-sm text-slate-600">{helper}</p>
    </Card>
  )
}
