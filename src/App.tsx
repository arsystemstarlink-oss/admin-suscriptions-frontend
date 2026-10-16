import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/routes'
import { usePushSync } from '@/hooks/usePushSync'

function App() {
  usePushSync()

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  )
}

export default App
