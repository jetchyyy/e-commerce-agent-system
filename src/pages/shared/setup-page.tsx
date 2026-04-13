import { PageHeader } from '../../components/shared/page-header'
import { Card } from '../../components/ui/card'

export function SetupPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Setup"
        title="Run the database schema, add environment variables, and bootstrap the first superadmin."
        description="The full implementation guide and SQL are included in the repository so you can wire this starter to your own Supabase project without fake seed data."
      />
      <Card className="space-y-3 text-sm leading-7 text-slate-600">
        <p>
          Architecture and implementation guide: `docs/implementation-guide.md`
        </p>
        <p>
          Supabase schema and RLS logic: `supabase/schema.sql`
        </p>
      </Card>
    </div>
  )
}
