import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { toast } from 'sonner'

import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { StatCard } from '../../components/shared/stat-card'
import { Card } from '../../components/ui/card'
import { fetchAnalyticsSnapshot, type AnalyticsSnapshot } from '../../features/operations/operations-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency } from '../../lib/utils'

export function AnalyticsPage() {
  const profile = useAuthStore((state) => state.profile)
  const [analytics, setAnalytics] = useState<AnalyticsSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadAnalytics() {
      if (!profile?.store_id) {
        setAnalytics(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        setAnalytics(await fetchAnalyticsSnapshot(profile.store_id))
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Unable to load analytics.')
      } finally {
        setIsLoading(false)
      }
    }

    void loadAnalytics()
  }, [profile?.store_id])

  const stats = analytics
    ? [
        {
          label: 'Revenue',
          value: formatCurrency(analytics.totalRevenue),
          helper: 'Combined online and POS revenue from real orders.',
        },
        {
          label: 'Orders',
          value: String(analytics.totalOrders),
          helper: 'All recorded order rows for this store.',
        },
        {
          label: 'Average order',
          value: formatCurrency(analytics.averageOrderValue),
          helper: 'Revenue divided by completed order volume.',
        },
      ]
    : []

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Analytics"
        title="Revenue, order mix, and product performance."
        description="Analytics are computed from real order and order item records so the store owner can see revenue patterns without relying on sample dashboards."
      />

      {isLoading ? (
        <Card className="text-sm text-slate-600">Loading analytics...</Card>
      ) : !analytics || analytics.totalOrders === 0 ? (
        <EmptyState
          title="No analytics data yet"
          description="Once the store processes orders, charts and performance summaries will appear here."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            {stats.map((item) => (
              <StatCard key={item.label} {...item} />
            ))}
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
            <Card className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.revenuePoints}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="label" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
                  <Bar dataKey="revenue" fill="#0f172a" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={analytics.statusBreakdown}
                    dataKey="count"
                    nameKey="status"
                    outerRadius={110}
                    fill="#f59e0b"
                    label
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card className="space-y-4">
            <h2 className="text-lg font-semibold text-slate-950">Top selling products</h2>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {analytics.topProducts.map((product) => (
                <div
                  key={product.productName}
                  className="rounded-2xl border border-slate-100 px-4 py-4"
                >
                  <p className="font-medium text-slate-950">{product.productName}</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Units sold: {product.quantitySold}
                  </p>
                  <p className="text-sm text-slate-600">
                    Revenue: {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
