import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/routes'
import { usePushSync } from '@/hooks/usePushSync'
import { ErrorBoundary } from '@/components/system/ErrorBoundary'
import { ConnectivityBanner } from '@/components/layout/ConnectivityBanner'
import { PwaUpdateBanner } from '@/components/layout/PwaUpdateBanner'

function navigateTo(path: string) {
  void router.navigate(path)
}

function App() {
  usePushSync(navigateTo)

  return (
    <ErrorBoundary>
      <ConnectivityBanner />
      <PwaUpdateBanner />
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </ErrorBoundary>
  )
}

export default App
