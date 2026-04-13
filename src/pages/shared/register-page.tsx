import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { signUp } from '../../features/auth/auth-service'

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name is required.'),
    email: z.email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm your password.'),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

type RegisterValues = z.infer<typeof registerSchema>

export function RegisterPage() {
  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await signUp(values.email, values.password, values.fullName)
      toast.success('Registration submitted. Check your email for confirmation.')
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Unable to create account.',
      )
    }
  })

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader
        eyebrow="Customer registration"
        title="Create a storefront account"
        description="Customers can self-register. Admin, superadmin, and agent roles should be provisioned through secured onboarding flows described in the setup guide and SQL."
      />

      <Card>
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Full name
            </label>
            <Input {...form.register('fullName')} />
            <p className="mt-1 text-xs text-rose-600">
              {form.formState.errors.fullName?.message}
            </p>
          </div>
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
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Confirm password
            </label>
            <Input type="password" {...form.register('confirmPassword')} />
            <p className="mt-1 text-xs text-rose-600">
              {form.formState.errors.confirmPassword?.message}
            </p>
          </div>
          <Button type="submit" className="w-full">
            Create account
          </Button>
        </form>
      </Card>

      <p className="text-sm text-slate-600">
        Already registered?{' '}
        <Link to="/login" className="font-medium text-slate-950 underline">
          Log in
        </Link>
      </p>
    </div>
  )
}
