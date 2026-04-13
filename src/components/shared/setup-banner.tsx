import { Link } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'

import { env } from '../../lib/env'
import { Card } from '../ui/card'

export function SetupBanner() {
  if (env.hasSupabase) {
    return null
  }

  return (
    <Card className="border-amber-200 bg-amber-50/80">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex gap-3">
          <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-slate-900">
              Supabase is not connected yet
            </h2>
            <p className="max-w-3xl text-sm leading-7 text-slate-700">
              Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to your local
              `.env`, run the SQL in [supabase/schema.sql](/c:/Users/carld/Desktop/e-commerce-with-agent-system/supabase/schema.sql),
              and this interface will start reading real store data with no mock
              records.
            </p>
          </div>
        </div>
        <Link
          to="/setup"
          className="text-sm font-medium text-slate-900 underline decoration-slate-300 underline-offset-4"
        >
          View setup guide
        </Link>
      </div>
    </Card>
  )
}
