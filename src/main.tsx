import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client'
import { ThemeProvider } from 'next-themes'
import { registerSW } from 'virtual:pwa-register'
import App from './App.tsx'
import { clearPersistedQueryCache, queryClient, persistOptions } from '@/lib/queryClient'
import { useAuthStore } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useExchangeStore } from '@/stores/exchange.store'
import '@fontsource-variable/figtree/wght.css'
import './index.css'

registerSW({ immediate: true })

if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => registration.unregister())
  })
  if ('caches' in window) {
    caches.keys().then((keys) => {
      keys.forEach((key) => caches.delete(key))
    })
  }
}

useAuthStore.getState().loadFromStorage()
// Sin sesión no debe restaurarse la caché de la anterior. Cubre las salidas que
// no pasan por logout(): sesión vencida o pestaña con "no recordarme" cerrada.
if (!useAuthStore.getState().isAuthenticated) {
  clearPersistedQueryCache()
}
useOrganizationStore.getState().loadFromStorage()
useExchangeStore.getState().loadFromStorage()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
        <App />
      </PersistQueryClientProvider>
    </ThemeProvider>
  </StrictMode>,
)
