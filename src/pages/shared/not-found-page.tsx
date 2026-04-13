import { Link } from 'react-router-dom'

import { EmptyState } from '../../components/shared/empty-state'
import { Button } from '../../components/ui/button'

export function NotFoundPage() {
  return (
    <EmptyState
      title="Page not found"
      description="The route you requested does not exist in this storefront or dashboard workspace."
      action={
        <Button asChild variant="secondary">
          <Link to="/">Return home</Link>
        </Button>
      }
    />
  )
}
