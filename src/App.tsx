import { RouterProvider } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { router } from '@/routes'
import { usePushSync } from '@/hooks/usePushSync'

function navigateTo(path: string) {
  void router.navigate(path)
}

function App() {
  usePushSync(navigateTo)

  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </>
  )
}

export default App
