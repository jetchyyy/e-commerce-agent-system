import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { updateOwnProfile } from '../../features/operations/operations-service'
import { useAuthStore } from '../../stores/auth-store'

const profileSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  phone: z.string().optional(),
})

type ProfileValues = z.infer<typeof profileSchema>

export function CustomerProfilePage() {
  const profile = useAuthStore((state) => state.profile)
  const setProfile = useAuthStore((state) => state.setProfile)

  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
    },
  })

  useEffect(() => {
    form.reset({
      fullName: profile?.full_name ?? '',
      phone: profile?.phone ?? '',
    })
  }, [form, profile?.full_name, profile?.phone])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!profile?.id) {
      toast.error('You must be signed in to update your profile.')
      return
    }

    try {
      const updated = await updateOwnProfile(profile.id, values)
      setProfile(updated)
      toast.success('Profile updated successfully.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to update profile.')
    }
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Profile"
        title="Update your personal details."
        description="Customers can only update their own profile row. Admin-only fields remain outside this view."
      />

      <Card className="max-w-2xl">
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Full name</label>
            <Input {...form.register('fullName')} />
            <p className="mt-1 text-xs text-rose-600">
              {form.formState.errors.fullName?.message}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Email</label>
            <Input value={profile?.email ?? ''} disabled />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">Phone</label>
            <Input {...form.register('phone')} />
          </div>

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Saving...' : 'Save profile'}
          </Button>
        </form>
      </Card>
    </div>
  )
}
