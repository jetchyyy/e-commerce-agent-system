import { Toaster } from 'sonner'

import { SessionProvider } from './features/auth/session-provider'
import { AppRoutes } from './routes/app-routes'

function App() {
  return (
    <SessionProvider>
      <AppRoutes />
      <Toaster richColors position="top-right" />
    </SessionProvider>
  )
}

export default App
