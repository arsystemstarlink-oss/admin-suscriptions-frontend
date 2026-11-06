import { hashKey, QueryClient } from '@tanstack/react-query'
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { qk } from '@/lib/query-keys'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      gcTime: 10 * 60_000,
      retry: 1,
      // Sin esto, una consulta sin conexión queda pausada sin datos ni error y la
      // UI la confunde con una lista vacía. Los datos en caché se conservan.
      networkMode: 'always',
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: false,
    },
  },
})

const PERSIST_MAX_AGE = 24 * 60 * 60_000

const persister = createSyncStoragePersister({
  storage: typeof window === 'undefined' ? undefined : window.localStorage,
  key: 'ar-admin-query-cache',
  throttleTime: 1000,
})

const AUTH_ME_HASH = hashKey(qk.auth.me)

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: PERSIST_MAX_AGE,
  buster: 'v3',
  dehydrateOptions: {
    // /auth/me no se persiste: es lo que valida la sesión en cada apertura y
    // una copia restaurada evitaría esa comprobación.
    shouldDehydrateQuery: (query) =>
      query.state.status === 'success' && query.queryHash !== AUTH_ME_HASH,
  },
}

export function clearPersistedQueryCache(): void {
  persister.removeClient()
}
