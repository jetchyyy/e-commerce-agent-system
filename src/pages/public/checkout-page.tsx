import { useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import { useStorefrontBranding } from '../../features/catalog/use-storefront-branding'
import { checkoutOrder } from '../../features/orders/order-service'
import { useAuthStore } from '../../stores/auth-store'
import { useCartStore } from '../../stores/cart-store'
import { useReferralStore } from '../../stores/referral-store'
import { formatCurrency } from '../../lib/utils'

const checkoutSchema = z.object({
  fullName: z.string().min(2, 'Full name is required.'),
  email: z.email('Enter a valid email address.'),
  phone: z.string().min(6, 'Phone is required.'),
  address: z.string().min(8, 'Address is required.'),
  notes: z.string().optional(),
})

type CheckoutFormValues = z.infer<typeof checkoutSchema>

export function CheckoutPage() {
  const { content } = useStorefrontBranding()
  const navigate = useNavigate()
  const session = useAuthStore((state) => state.session)
  const profile = useAuthStore((state) => state.profile)
  const items = useCartStore((state) => state.items)
  const clearCart = useCartStore((state) => state.clear)
  const referralCode = useReferralStore((state) => state.referralCode)
  const clearReferral = useReferralStore((state) => state.clearReferral)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      fullName: profile?.full_name ?? '',
      email: profile?.email ?? '',
      phone: profile?.phone ?? '',
      address: '',
      notes: '',
    },
  })

  const totals = useMemo(() => {
    return {
      itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
      total: items.reduce((sum, item) => sum + item.price * item.quantity, 0),
      storeId: items[0]?.storeId ?? null,
    }
  }, [items])

  const onSubmit = form.handleSubmit(async (values) => {
    if (!session?.user.id || !profile) {
      toast.error('Please sign in before placing an order.')
      navigate('/login')
      return
    }

    if (!totals.storeId || items.length === 0) {
      toast.error('Your cart is empty.')
      return
    }

    setIsSubmitting(true)

    try {
      const submissionNotes = JSON.stringify({
        customer_name: values.fullName,
        customer_email: values.email,
        customer_phone: values.phone,
        customer_address: values.address,
        customer_notes: values.notes || null,
      })

      const result = await checkoutOrder({
        storeId: totals.storeId,
        customerId: session.user.id,
        items: items.map((item) => ({
          product_id: item.productId,
          quantity: item.quantity,
        })),
        idempotencyKey: crypto.randomUUID(),
        notes: submissionNotes,
      })

      clearCart()
      clearReferral()
      toast.success(`Order ${result?.order_number ?? ''} placed successfully.`)
      navigate('/account/orders')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to place order.')
    } finally {
      setIsSubmitting(false)
    }
  })

  if (items.length === 0) {
    return (
      <Card className="space-y-4">
        <PageHeader
          eyebrow={content.checkout.eyebrow}
          title={content.checkout.emptyTitle}
          description={content.checkout.emptyDescription}
        />
        <Button asChild className="w-fit">
          <Link to="/shop">Go to shop</Link>
        </Button>
      </Card>
    )
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <div className="space-y-6">
        <PageHeader
          eyebrow={content.checkout.eyebrow}
          title={content.checkout.title}
          description={content.checkout.description}
        />

        {!session ? (
          <Card className="space-y-4">
            <p className="text-sm text-slate-700">
              {content.checkout.signInPrompt}
            </p>
            <Button asChild className="w-fit">
              <Link to="/login">{content.checkout.signInLabel}</Link>
            </Button>
          </Card>
        ) : (
          <Card>
            <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
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
                  Phone
                </label>
                <Input {...form.register('phone')} />
                <p className="mt-1 text-xs text-rose-600">
                  {form.formState.errors.phone?.message}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Address
                </label>
                <Textarea {...form.register('address')} />
                <p className="mt-1 text-xs text-rose-600">
                  {form.formState.errors.address?.message}
                </p>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Notes
                </label>
                <Textarea {...form.register('notes')} />
              </div>

              <div className="md:col-span-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting
                    ? content.checkout.submittingLabel
                    : content.checkout.submitLabel}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>

      <Card className="space-y-4">
        <h2 className="text-xl font-semibold text-slate-950">{content.checkout.summaryTitle}</h2>
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.productId} className="flex items-center justify-between text-sm">
              <div>
                <p className="font-medium text-slate-900">{item.name}</p>
                <p className="text-slate-500">Qty {item.quantity}</p>
              </div>
              <p className="font-semibold text-slate-950">
                {formatCurrency(item.price * item.quantity)}
              </p>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-100 pt-4 text-sm text-slate-700">
          <div className="flex items-center justify-between">
            <span>Total items</span>
            <span>{totals.itemCount}</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-lg font-semibold text-slate-950">
            <span>Total</span>
            <span>{formatCurrency(totals.total)}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">
          <span className="font-semibold text-slate-950">{content.checkout.referralLabel}: </span>
          {referralCode ?? 'none captured'}
        </div>
      </Card>
    </div>
  )
}
