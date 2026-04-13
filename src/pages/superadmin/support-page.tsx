import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { LifeBuoy, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'

import { DataTable } from '../../components/shared/data-table'
import { PageHeader } from '../../components/shared/page-header'
import { Card } from '../../components/ui/card'
import {
  fetchAuditLogs,
  type AuditLogRow,
} from '../../features/auth/superadmin-service'
import { formatDate } from '../../lib/utils'

const columns: ColumnDef<AuditLogRow>[] = [
  {
    header: 'Action',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-950">{row.original.action}</p>
        <p className="text-xs text-slate-500">{row.original.entity_type}</p>
      </div>
    ),
  },
  {
    header: 'Store',
    cell: ({ row }) => row.original.stores?.name ?? 'Platform-level',
  },
  {
    header: 'Actor',
    cell: ({ row }) =>
      row.original.actor?.full_name ||
      row.original.actor?.email ||
      'Unknown actor',
  },
  {
    header: 'When',
    cell: ({ row }) => formatDate(row.original.created_at),
  },
]

export function SupportPage() {
  const [logs, setLogs] = useState<AuditLogRow[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadLogs() {
      setIsLoading(true)

      try {
        const data = await fetchAuditLogs(50)
        setLogs(data)
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : 'Unable to load audit logs.',
        )
      } finally {
        setIsLoading(false)
      }
    }

    void loadLogs()
  }, [])

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Support"
        title="Operational support, audit visibility, and turnover confidence."
        description="Before handing the system to the store owner/admin, use this area to review superadmin-controlled events like bootstrap, owner assignment, website setup, payout actions, and other tracked changes."
      />

      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        <Card className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Turnover checklist
              </h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                Confirm these before handoff:
              </p>
            </div>
          </div>

          <div className="space-y-3 text-sm leading-7 text-slate-600">
            <p>1. Store record exists and is active.</p>
            <p>2. Branding is saved for the store.</p>
            <p>3. Owner/admin account is created and linked to the store.</p>
            <p>4. Product image buckets and storage access are working.</p>
            <p>5. Auth login and role-based dashboard access are verified.</p>
          </div>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <LifeBuoy className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Recent audit activity
              </h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                Superadmin support actions and sensitive operational events are
                shown here for verification.
              </p>
            </div>
          </div>

          {isLoading ? (
            <Card className="border-dashed text-sm text-slate-600">
              Loading audit activity...
            </Card>
          ) : (
            <DataTable
              columns={columns}
              data={logs}
              emptyTitle="No audit logs yet"
              emptyDescription="Audit entries will appear here as the platform is provisioned and used."
            />
          )}
        </Card>
      </div>
    </div>
  )
}
