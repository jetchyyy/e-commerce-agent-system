import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { ShieldPlus, UserCog, UserRoundCheck } from 'lucide-react'
import { toast } from 'sonner'
import { z } from 'zod'

import { DataTable } from '../../components/shared/data-table'
import { EmptyState } from '../../components/shared/empty-state'
import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Select } from '../../components/ui/select'
import {
  createStoreAdmin,
  fetchAdminAccounts,
  fetchRegisteredProfiles,
  fetchStores,
  promoteProfileToAdmin,
  type AdminAccountRow,
  type RegisteredProfileRow,
  type StoreOption,
} from '../../features/auth/superadmin-service'
import { formatDate } from '../../lib/utils'

const createAdminSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  phone: z.string().optional(),
  storeId: z.string().min(1, 'Select a store.'),
})

const promoteAdminSchema = z.object({
  profileId: z.string().min(1, 'Select an existing registered user.'),
  storeId: z.string().min(1, 'Select a store.'),
})

type CreateAdminValues = z.infer<typeof createAdminSchema>
type PromoteAdminValues = z.infer<typeof promoteAdminSchema>

const columns: ColumnDef<AdminAccountRow>[] = [
  {
    header: 'Owner / Admin',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-950">
          {row.original.full_name ?? 'Unnamed admin'}
        </p>
        <p className="text-xs text-slate-500">{row.original.email ?? 'No email'}</p>
      </div>
    ),
  },
  {
    header: 'Store',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-900">
          {row.original.stores?.name ?? 'Unassigned'}
        </p>
        <p className="text-xs text-slate-500">
          {row.original.stores?.slug ?? 'No slug'}
        </p>
      </div>
    ),
  },
  {
    header: 'Phone',
    cell: ({ row }) => row.original.phone ?? 'Not set',
  },
  {
    header: 'Status',
    cell: ({ row }) => (row.original.is_active ? 'Active' : 'Inactive'),
  },
  {
    header: 'Created',
    cell: ({ row }) => formatDate(row.original.created_at),
  },
]

export function AdminAccountsPage() {
  const [stores, setStores] = useState<StoreOption[]>([])
  const [admins, setAdmins] = useState<AdminAccountRow[]>([])
  const [profiles, setProfiles] = useState<RegisteredProfileRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isPromoting, setIsPromoting] = useState(false)

  const createForm = useForm<CreateAdminValues>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      storeId: '',
    },
  })

  const promoteForm = useForm<PromoteAdminValues>({
    resolver: zodResolver(promoteAdminSchema),
    defaultValues: {
      profileId: '',
      storeId: '',
    },
  })

  async function loadData() {
    setIsLoading(true)

    try {
      const [storeRows, adminRows, profileRows] = await Promise.all([
        fetchStores(),
        fetchAdminAccounts(),
        fetchRegisteredProfiles(),
      ])

      setStores(storeRows)
      setAdmins(adminRows)
      setProfiles(profileRows)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to load stores and admin accounts.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadData()
  }, [])

  const eligibleProfiles = useMemo(
    () => profiles.filter((profile) => profile.role !== 'admin'),
    [profiles],
  )

  const onCreate = createForm.handleSubmit(async (values) => {
    setIsCreating(true)

    try {
      const result = await createStoreAdmin(values)
      toast.success(`Store owner created for ${result.email}.`)
      createForm.reset({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        storeId: '',
      })
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to create the store owner/admin.',
      )
    } finally {
      setIsCreating(false)
    }
  })

  const onPromote = promoteForm.handleSubmit(async (values) => {
    setIsPromoting(true)

    try {
      const selectedProfile = eligibleProfiles.find(
        (profile) => profile.id === values.profileId,
      )

      await promoteProfileToAdmin({
        profileId: values.profileId,
        storeId: values.storeId,
        fullName: selectedProfile?.full_name ?? undefined,
        phone: selectedProfile?.phone ?? undefined,
      })

      toast.success('Existing registered user promoted to store owner/admin.')
      promoteForm.reset({
        profileId: '',
        storeId: '',
      })
      await loadData()
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Unable to promote the selected profile.',
      )
    } finally {
      setIsPromoting(false)
    }
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Admin accounts"
        title="Create or assign the single store owner/admin."
        description="This deployment is for one store owner first. Use the direct create flow if the Edge Function is available, or promote one existing registered account into the single owner/admin role and attach it to the store."
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <ShieldPlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Create owner/admin directly
              </h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                This uses the Edge Function to create the Auth user and assign
                the role in one step.
              </p>
            </div>
          </div>

          {stores.length === 0 && !isLoading ? (
            <EmptyState
              title="Create a store first"
              description="A store owner/admin must be attached to a store. Add a store before provisioning the owner account."
            />
          ) : (
            <form onSubmit={onCreate} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Full name
                </label>
                <Input {...createForm.register('fullName')} />
                <p className="mt-1 text-xs text-rose-600">
                  {createForm.formState.errors.fullName?.message}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <Input type="email" {...createForm.register('email')} />
                <p className="mt-1 text-xs text-rose-600">
                  {createForm.formState.errors.email?.message}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Temporary password
                </label>
                <Input type="password" {...createForm.register('password')} />
                <p className="mt-1 text-xs text-rose-600">
                  {createForm.formState.errors.password?.message}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Phone
                </label>
                <Input {...createForm.register('phone')} />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Store
                </label>
                <Select {...createForm.register('storeId')}>
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.slug})
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-rose-600">
                  {createForm.formState.errors.storeId?.message}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isCreating || stores.length === 0}
              >
                {isCreating ? 'Creating owner account...' : 'Create owner/admin'}
              </Button>
            </form>
          )}
        </Card>

        <Card className="space-y-5">
          <div className="flex items-start gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
              <UserRoundCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-semibold text-slate-950">
                Fallback: promote an existing registered user
              </h2>
              <p className="mt-1 text-sm leading-7 text-slate-600">
                If the direct creation flow is blocked, let the future owner
                register normally first, then promote that account here.
              </p>
            </div>
          </div>

          {eligibleProfiles.length === 0 && !isLoading ? (
            <EmptyState
              title="No registered users available"
              description="Have the future store owner create a normal account first through the register page, then come back here to promote that account."
            />
          ) : (
            <form onSubmit={onPromote} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Registered user
                </label>
                <Select {...promoteForm.register('profileId')}>
                  <option value="">Select user</option>
                  {eligibleProfiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {(profile.full_name || profile.email || profile.id) +
                        ` (${profile.role})`}
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-rose-600">
                  {promoteForm.formState.errors.profileId?.message}
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Store
                </label>
                <Select {...promoteForm.register('storeId')}>
                  <option value="">Select store</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store.slug})
                    </option>
                  ))}
                </Select>
                <p className="mt-1 text-xs text-rose-600">
                  {promoteForm.formState.errors.storeId?.message}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                variant="secondary"
                disabled={isPromoting || stores.length === 0}
              >
                {isPromoting ? 'Promoting user...' : 'Promote to owner/admin'}
              </Button>
            </form>
          )}
        </Card>
      </div>

      <Card className="space-y-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
            <UserCog className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950">
              Existing owner/admin accounts
            </h2>
            <p className="mt-1 text-sm leading-7 text-slate-600">
              Review which store each owner is attached to and confirm the
              account provisioning history.
            </p>
          </div>
        </div>

        {isLoading ? (
          <Card className="border-dashed text-sm text-slate-600">
            Loading store owners and stores...
          </Card>
        ) : (
          <DataTable
            columns={columns}
            data={admins}
            emptyTitle="No store owner/admin accounts yet"
            emptyDescription="Use either the direct create flow or the fallback promotion flow to assign the first owner."
          />
        )}
      </Card>
    </div>
  )
}
