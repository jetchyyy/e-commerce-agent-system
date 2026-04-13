import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { Building2, Store } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { DataTable } from '../../components/shared/data-table'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import {
  createStore,
  fetchAdminAccounts,
  fetchBrandingRecords,
  fetchStores,
  type AdminAccountRow,
  type StoreBrandingRow,
  type StoreOption,
} from '../../features/auth/superadmin-service'
import { formatDate } from '../../lib/utils'

const createStoreSchema = z.object({
  name: z.string().min(2, 'Store name is required.'),
  slug: z.string().optional(),
})

type CreateStoreValues = z.infer<typeof createStoreSchema>

interface StoreProvisionRow extends StoreOption {
  hasBranding: boolean
  hasAdmin: boolean
}

const columns: ColumnDef<StoreProvisionRow>[] = [
  {
    header: 'Store',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-950">{row.original.name}</p>
        <p className="text-xs text-slate-500">{row.original.slug}</p>
      </div>
    ),
  },
  {
    header: 'Branding',
    cell: ({ row }) => (row.original.hasBranding ? 'Configured' : 'Pending'),
  },
  {
    header: 'Owner/Admin',
    cell: ({ row }) => (row.original.hasAdmin ? 'Assigned' : 'Pending'),
  },
  {
    header: 'Status',
    cell: ({ row }) =>
      row.original.hasBranding && row.original.hasAdmin
        ? 'Ready to hand over'
        : 'In setup',
  },
  {
    header: 'Created',
    cell: ({ row }) =>
      row.original.created_at ? formatDate(row.original.created_at) : 'N/A',
  },
]

function buildProvisionRows(
  stores: StoreOption[],
  branding: StoreBrandingRow[],
  admins: AdminAccountRow[],
) {
  const brandedStoreIds = new Set(branding.map((item) => item.store_id))
  const adminStoreIds = new Set(
    admins.map((item) => item.store_id).filter(Boolean) as string[],
  )

  return stores.map((store) => ({
    ...store,
    hasBranding: brandedStoreIds.has(store.id),
    hasAdmin: adminStoreIds.has(store.id),
  }))
}

export function StoresPage() {
  const [rows, setRows] = useState<StoreProvisionRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateStoreValues>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      name: '',
      slug: '',
    },
  })

  async function loadData() {
    setIsLoading(true)

    try {
      const [stores, branding, admins] = await Promise.all([
        fetchStores(),
        fetchBrandingRecords(),
        fetchAdminAccounts(),
      ])

      setRows(buildProvisionRows(stores, branding, admins))
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to load stores.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const onSubmit = form.handleSubmit(async (values) => {
    if (rows.length > 0) {
      toast.error(
        'This deployment is configured for a single store. Update the existing store instead of creating another one.',
      )
      return
    }

    setIsSubmitting(true)

    try {
      const createdStore = await createStore(values)
      toast.success(`Store ${createdStore.name} created successfully.`)
      form.reset({
        name: '',
        slug: '',
      })
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create store.',
      )
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Stores"
        title="Configure the single store and confirm handoff readiness."
        description="This deployment is meant for one store owner. The superadmin creates the one active store record, controls the website branding, and then assigns the owner/admin account."
      />

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Building2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Single-store setup
              </h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                Create the store record once. After that, use website control
                and owner assignment to finish the handoff.
              </p>
            </div>
          </div>

          {rows.length > 0 ? (
            <Card className="border-amber-200 bg-amber-50 text-sm leading-7 text-amber-900">
              One store is already configured for this deployment. Creating
              additional stores is intentionally blocked in the UI so the system
              stays single-owner and single-store.
            </Card>
          ) : null}

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Store name
              </label>
              <Input {...form.register('name')} />
              <p className="mt-1 text-xs text-rose-600">
                {form.formState.errors.name?.message}
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Preferred slug
              </label>
              <Input {...form.register('slug')} placeholder="optional-store-slug" />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || rows.length > 0}
            >
              {isSubmitting
                ? 'Creating store...'
                : rows.length > 0
                  ? 'Single store already configured'
                  : 'Create store'}
            </Button>
          </form>
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
              <Store className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Handoff readiness
              </h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                Use this view to confirm whether the one live store is still
                waiting on website control or owner assignment before handoff.
              </p>
            </div>
          </div>

          {isLoading ? (
            <Card className="border-dashed text-sm text-slate-600">
              Loading store readiness...
            </Card>
          ) : (
            <DataTable
              columns={columns}
              data={rows}
              emptyTitle="No store configured yet"
              emptyDescription="Create the single store to begin the owner handoff workflow."
            />
          )}
        </Card>
      </div>
    </div>
  )
}
