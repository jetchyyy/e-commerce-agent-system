import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { PageHeader } from '../../components/shared/page-header'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'

const settingsSchema = z.object({
  storeName: z.string().min(2, 'Store name is required.'),
  supportEmail: z.email('Enter a valid support email.'),
  supportPhone: z.string().min(6, 'Phone is required.'),
  primaryColor: z.string().min(4, 'Primary color is required.'),
  accentColor: z.string().min(4, 'Accent color is required.'),
  footerText: z.string().min(4, 'Footer text is required.'),
  receiptNotes: z.string().min(4, 'Receipt note is required.'),
})

type SettingsValues = z.infer<typeof settingsSchema>

export function SettingsPage() {
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      storeName: '',
      supportEmail: '',
      supportPhone: '',
      primaryColor: '#0f172a',
      accentColor: '#f59e0b',
      footerText: '',
      receiptNotes: '',
    },
  })

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="White-label settings"
        title="Store identity, storefront presentation, and receipt branding."
        description="Superadmin can own full white-label controls, while store admins can be limited to the subset you choose. All branding values should be stored in `store_branding` and related settings tables."
      />

      <Card>
        <form className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Store name
            </label>
            <Input {...form.register('storeName')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Support email
            </label>
            <Input {...form.register('supportEmail')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Support phone
            </label>
            <Input {...form.register('supportPhone')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Primary color
            </label>
            <Input {...form.register('primaryColor')} />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Accent color
            </label>
            <Input {...form.register('accentColor')} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Footer text
            </label>
            <Textarea {...form.register('footerText')} />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-sm font-medium text-slate-700">
              Receipt notes
            </label>
            <Textarea {...form.register('receiptNotes')} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Save white-label settings</Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
