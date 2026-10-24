import { Outlet } from 'react-router-dom'
import { ErrorBoundary } from '@/components/UI/ErrorBoundary'

/**
 * Root layout wrapper — wraps every page with the top-level ErrorBoundary.
 * Each page is responsible for its own header/nav/footer layout.
 */
export function RootLayout() {
  return (
    <ErrorBoundary>
      <Outlet />
    </ErrorBoundary>
  )
}
