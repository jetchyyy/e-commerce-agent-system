import { useCallback, useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import type { ColumnDef } from '@tanstack/react-table'
import { useForm } from 'react-hook-form'
import { HandCoins, TicketPercent, UserPlus } from 'lucide-react'
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
  createAgentAccount,
  fetchAdminAgentWorkspace,
  processPayout,
  updateAgent,
  type AgentAdminRow,
  type AgentWorkspace,
} from '../../features/agents/agent-service'
import { useAuthStore } from '../../stores/auth-store'
import { formatCurrency, formatDate } from '../../lib/utils'

const createAgentSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  phone: z.string().optional(),
  referralCode: z.string().min(3, 'Referral code is required.'),
  commissionType: z.enum(['fixed', 'percentage']),
  commissionValue: z.coerce.number().min(0, 'Commission value must be zero or greater.'),
})

const updateAgentSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  phone: z.string().optional(),
  referralCode: z.string().min(3, 'Referral code is required.'),
  commissionType: z.enum(['fixed', 'percentage']),
  commissionValue: z.coerce.number().min(0, 'Commission value must be zero or greater.'),
  isActive: z.boolean(),
})

const payoutSchema = z.object({
  agentId: z.string().min(1, 'Select an agent.'),
  payoutMethod: z.string().min(2, 'Payout method is required.'),
  payoutNotes: z.string().optional(),
})

type CreateAgentFormValues = z.input<typeof createAgentSchema>
type CreateAgentValues = z.output<typeof createAgentSchema>
type UpdateAgentFormValues = z.input<typeof updateAgentSchema>
type UpdateAgentValues = z.output<typeof updateAgentSchema>
type PayoutValues = z.infer<typeof payoutSchema>

const columns: ColumnDef<AgentAdminRow>[] = [
  {
    header: 'Agent',
    cell: ({ row }) => (
      <div>
        <p className="font-medium text-slate-950">
          {row.original.profile?.full_name ?? 'Unnamed agent'}
        </p>
        <p className="text-xs text-slate-500">
          {row.original.profile?.email ?? 'No email'}
        </p>
      </div>
    ),
  },
  { header: 'Referral code', accessorKey: 'referral_code' },
  {
    header: 'Commission',
    cell: ({ row }) =>
      row.original.commission_type === 'percentage'
        ? `${row.original.commission_value}%`
        : formatCurrency(row.original.commission_value),
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

export function AgentsPage() {
  const profile = useAuthStore((state) => state.profile)
  const [workspace, setWorkspace] = useState<AgentWorkspace | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPaying, setIsPaying] = useState(false)
  const [selectedAgent, setSelectedAgent] = useState<AgentAdminRow | null>(null)

  const createForm = useForm<CreateAgentFormValues, undefined, CreateAgentValues>({
    resolver: zodResolver(createAgentSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      phone: '',
      referralCode: '',
      commissionType: 'percentage',
      commissionValue: 10,
    },
  })

  const updateForm = useForm<UpdateAgentFormValues, undefined, UpdateAgentValues>({
    resolver: zodResolver(updateAgentSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      referralCode: '',
      commissionType: 'percentage',
      commissionValue: 10,
      isActive: true,
    },
  })

  const payoutForm = useForm<PayoutValues>({
    resolver: zodResolver(payoutSchema),
    defaultValues: {
      agentId: '',
      payoutMethod: 'cash',
      payoutNotes: '',
    },
  })

  const loadWorkspace = useCallback(async () => {
    if (!profile?.store_id) {
      setWorkspace(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    try {
      setWorkspace(await fetchAdminAgentWorkspace(profile.store_id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to load agent workspace.')
    } finally {
      setIsLoading(false)
    }
  }, [profile?.store_id])

  useEffect(() => {
    void loadWorkspace()
  }, [loadWorkspace])

  const commissionSummary = useMemo(() => {
    const commissions = workspace?.commissions ?? []
    return {
      outstanding: commissions
        .filter((commission) => ['approved', 'locked'].includes(commission.status) && !commission.payout_id)
        .reduce((sum, commission) => sum + commission.commission_amount, 0),
      paid: commissions
        .filter((commission) => commission.status === 'paid')
        .reduce((sum, commission) => sum + commission.commission_amount, 0),
    }
  }, [workspace?.commissions])

  function beginEdit(agent: AgentAdminRow) {
    setSelectedAgent(agent)
    updateForm.reset({
      fullName: agent.profile?.full_name ?? '',
      phone: agent.profile?.phone ?? '',
      referralCode: agent.referral_code,
      commissionType: agent.commission_type,
      commissionValue: agent.commission_value,
      isActive: agent.is_active,
    })
    payoutForm.setValue('agentId', agent.id)
  }

  const onCreate = createForm.handleSubmit(async (values) => {
    if (!profile?.store_id) {
      toast.error('This admin account is not attached to a store.')
      return
    }

    setIsCreating(true)
    try {
      await createAgentAccount({
        fullName: values.fullName,
        email: values.email,
        password: values.password,
        phone: values.phone,
        storeId: profile.store_id,
        referralCode: values.referralCode,
        commissionType: values.commissionType,
        commissionValue: values.commissionValue,
      })

      toast.success('Agent account created successfully.')
      createForm.reset({
        fullName: '',
        email: '',
        password: '',
        phone: '',
        referralCode: '',
        commissionType: 'percentage',
        commissionValue: 10,
      })
      await loadWorkspace()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to create agent account.')
    } finally {
      setIsCreating(false)
    }
  })

  const onUpdate = updateForm.handleSubmit(async (values) => {
    if (!selectedAgent) {
      return
    }

    setIsSaving(true)
    try {
      await updateAgent(selectedAgent.id, values)
      toast.success('Agent updated successfully.')
      await loadWorkspace()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update agent.')
    } finally {
      setIsSaving(false)
    }
  })

  const onPayout = payoutForm.handleSubmit(async (values) => {
    if (!profile?.store_id || !profile?.id) {
      toast.error('This admin account is not attached correctly.')
      return
    }

    setIsPaying(true)
    try {
      const result = await processPayout({
        storeId: profile.store_id,
        agentId: values.agentId,
        processedBy: profile.id,
        idempotencyKey: crypto.randomUUID(),
        payoutMethod: values.payoutMethod,
        payoutNotes: values.payoutNotes,
      })

      toast.success(
        `Payout ${result?.payout_reference ?? ''} processed for ${formatCurrency(result?.total_amount ?? 0)}.`,
      )
      payoutForm.reset({
        agentId: '',
        payoutMethod: 'cash',
        payoutNotes: '',
      })
      await loadWorkspace()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to process payout.')
    } finally {
      setIsPaying(false)
    }
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Agents"
        title="Manage referrals, commissions, and payout safety."
        description="Admins can create agent accounts, update commission settings, inspect referral activity, and process locked payouts without double-payment risk."
      />

      {!profile?.store_id ? (
        <EmptyState
          title="No store assigned"
          description="Attach this admin account to a store before managing agents."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <TicketPercent className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                  Outstanding commission
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatCurrency(commissionSummary.outstanding)}
                </p>
              </div>
            </Card>

            <Card className="flex items-start gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <HandCoins className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm uppercase tracking-[0.18em] text-slate-500">
                  Paid commissions
                </p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {formatCurrency(commissionSummary.paid)}
                </p>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <Card className="space-y-5">
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                  <UserPlus className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-slate-950">Create agent account</h2>
                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    This creates the auth user, agent profile, default referral link, and commission setup in one flow.
                  </p>
                </div>
              </div>

              <form onSubmit={onCreate} className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
                    <Input {...createForm.register('fullName')} />
                    <p className="mt-1 text-xs text-rose-600">
                      {createForm.formState.errors.fullName?.message}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
                    <Input type="email" {...createForm.register('email')} />
                    <p className="mt-1 text-xs text-rose-600">
                      {createForm.formState.errors.email?.message}
                    </p>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Temporary password</label>
                    <Input type="password" {...createForm.register('password')} />
                    <p className="mt-1 text-xs text-rose-600">
                      {createForm.formState.errors.password?.message}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                    <Input {...createForm.register('phone')} />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Referral code</label>
                    <Input {...createForm.register('referralCode')} />
                    <p className="mt-1 text-xs text-rose-600">
                      {createForm.formState.errors.referralCode?.message}
                    </p>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Commission type</label>
                    <Select {...createForm.register('commissionType')}>
                      <option value="percentage">Percentage</option>
                      <option value="fixed">Fixed</option>
                    </Select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Commission value</label>
                    <Input type="number" step="0.01" {...createForm.register('commissionValue')} />
                    <p className="mt-1 text-xs text-rose-600">
                      {createForm.formState.errors.commissionValue?.message}
                    </p>
                  </div>
                </div>

                <Button type="submit" disabled={isCreating}>
                  {isCreating ? 'Creating agent...' : 'Create agent'}
                </Button>
              </form>
            </Card>

            <Card className="space-y-5">
              <div>
                <h2 className="text-lg font-semibold text-slate-950">Agent payout processing</h2>
                <p className="mt-1 text-sm leading-7 text-slate-600">
                  Payouts are processed through a transactional SQL function with idempotency and row locking.
                </p>
              </div>

              <form onSubmit={onPayout} className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Agent</label>
                  <Select {...payoutForm.register('agentId')}>
                    <option value="">Select agent</option>
                    {(workspace?.agents ?? []).map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.profile?.full_name || agent.profile?.email || agent.referral_code}
                      </option>
                    ))}
                  </Select>
                  <p className="mt-1 text-xs text-rose-600">
                    {payoutForm.formState.errors.agentId?.message}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Payout method</label>
                  <Input {...payoutForm.register('payoutMethod')} />
                  <p className="mt-1 text-xs text-rose-600">
                    {payoutForm.formState.errors.payoutMethod?.message}
                  </p>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-700">Notes</label>
                  <Input {...payoutForm.register('payoutNotes')} />
                </div>

                <Button type="submit" variant="secondary" disabled={isPaying}>
                  {isPaying ? 'Processing payout...' : 'Process payout'}
                </Button>
              </form>
            </Card>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
            <Card className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-950">Agents</h2>
              {isLoading ? (
                <Card className="text-sm text-slate-600">Loading agents...</Card>
              ) : !workspace || workspace.agents.length === 0 ? (
                <EmptyState
                  title="No agents yet"
                  description="Create the first agent account to start referral tracking."
                />
              ) : (
                <div className="space-y-4">
                  <DataTable
                    columns={columns}
                    data={workspace.agents}
                    emptyTitle="No agents"
                    emptyDescription="Create the first agent to get started."
                  />

                  <div className="grid gap-3 md:grid-cols-2">
                    {workspace.agents.map((agent) => {
                      const outstanding = workspace.commissions
                        .filter(
                          (commission) =>
                            commission.agent_id === agent.id &&
                            ['approved', 'locked'].includes(commission.status) &&
                            !commission.payout_id,
                        )
                        .reduce((sum, commission) => sum + commission.commission_amount, 0)

                      const conversions = workspace.referrals.filter(
                        (referral) => referral.agent_id === agent.id,
                      ).length

                      return (
                        <button
                          key={agent.id}
                          type="button"
                          onClick={() => beginEdit(agent)}
                          className="rounded-2xl border border-slate-200 bg-white px-4 py-4 text-left transition hover:border-slate-400"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-medium text-slate-950">
                                {agent.profile?.full_name || agent.referral_code}
                              </p>
                              <p className="text-sm text-slate-500">{agent.referral_code}</p>
                            </div>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                              {agent.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                          <div className="mt-3 grid gap-1 text-sm text-slate-600">
                            <p>Conversions: {conversions}</p>
                            <p>Outstanding: {formatCurrency(outstanding)}</p>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}
            </Card>

            <Card className="space-y-5">
              <h2 className="text-lg font-semibold text-slate-950">
                {selectedAgent ? 'Edit selected agent' : 'Select an agent to edit'}
              </h2>

              {selectedAgent ? (
                <form onSubmit={onUpdate} className="space-y-4">
                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Display name</label>
                    <Input {...updateForm.register('fullName')} />
                    <p className="mt-1 text-xs text-rose-600">
                      {updateForm.formState.errors.fullName?.message}
                    </p>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
                    <Input {...updateForm.register('phone')} />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Referral code</label>
                      <Input {...updateForm.register('referralCode')} />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-medium text-slate-700">Commission type</label>
                      <Select {...updateForm.register('commissionType')}>
                        <option value="percentage">Percentage</option>
                        <option value="fixed">Fixed</option>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-slate-700">Commission value</label>
                    <Input type="number" step="0.01" {...updateForm.register('commissionValue')} />
                  </div>

                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                    <input type="checkbox" {...updateForm.register('isActive')} />
                    Agent is active
                  </label>

                  <Button type="submit" disabled={isSaving}>
                    {isSaving ? 'Saving agent...' : 'Save agent'}
                  </Button>
                </form>
              ) : (
                <p className="text-sm leading-7 text-slate-600">
                  Pick an agent from the list to adjust commission settings or active status.
                </p>
              )}
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
