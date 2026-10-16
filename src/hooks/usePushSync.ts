import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { getInvalidationKeys, type PushMessageData } from '@/lib/push-sync'

interface ServiceWorkerPushMessage {
  type?: string
  data?: PushMessageData
}

/**
 * Escucha los avisos reenviados por el service worker y refresca únicamente
 * las consultas afectadas por el push, en lugar de consultar la API por polling.
 */
export function usePushSync(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent<ServiceWorkerPushMessage>) => {
      const keys = getInvalidationKeys(event.data)
      for (const queryKey of keys) {
        queryClient.invalidateQueries({ queryKey })
      }
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [queryClient])
}
