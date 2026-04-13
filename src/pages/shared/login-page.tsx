import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { fetchProfile, signIn } from '../../features/auth/auth-service'
import { getDefaultRouteForRole } from '../../lib/auth-routing'
import { useAuthStore } from '../../stores/auth-store'

const loginSchema = z.object({
  email: z.email('Enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const isReady = useAuthStore((state) => state.isReady)
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)
  const [authError, setAuthError] = useState<string | null>(null)
  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const from = (location.state as { from?: { pathname?: string } } | null)?.from
    ?.pathname

  useEffect(() => {
    if (!isReady || !session || !profile) {
      return
    }

    navigate(from ?? getDefaultRouteForRole(profile.role), { replace: true })
  }, [from, isReady, navigate, profile, session])

  const onSubmit = form.handleSubmit(
    async (values) => {
      try {
        setAuthError(null)

        const session = await signIn(values.email, values.password)

        if (!session?.user.id) {
          throw new Error('Login succeeded but no user session was returned.')
        }

        const profile = await fetchProfile(session.user.id)

        if (!profile) {
          throw new Error(
            'Your Auth account exists, but the matching profile row was not found. Check public.profiles for this user.',
          )
        }

        toast.success('Signed in successfully.')
        navigate(from ?? getDefaultRouteForRole(profile.role))
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to sign you in.'
        setAuthError(message)
        toast.error(message)
      }
    },
    () => {
      setAuthError('Please fix the highlighted fields before logging in.')
      toast.error('Please fix the highlighted fields before logging in.')
    },
  )

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Secure access"
        title="Log in as customer, admin, superadmin, or agent."
        description="Supabase Auth handles the session; role-specific access is enforced by both route guards and row-level security."
      />

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          {authError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {authError}
            </div>
          ) : null}
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Email
            </label>
            <Input {...form.register('email')} />
            <p className="mt-1 text-xs text-rose-600">
              {form.formState.errors.email?.message}
            </p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Password
            </label>
            <Input type="password" {...form.register('password')} />
            <p className="mt-1 text-xs text-rose-600">
              {form.formState.errors.password?.message}
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? 'Logging in...' : 'Log in'}
          </Button>
        </form>
      </Card>

      <p className="text-sm text-slate-600">
        Need a customer account?{' '}
        <Link to="/register" className="font-medium text-slate-950 underline">
          Create one here
        </Link>
      </p>

      <Card className="border-dashed bg-slate-50/70 text-sm leading-7 text-slate-600">
        If login keeps failing, verify two things in Supabase:
        <br />
        1. The user exists in `Authentication &gt; Users`
        <br />
        2. The same user ID has a matching row in `public.profiles` with the correct role
      </Card>
    </div>
  )
}
