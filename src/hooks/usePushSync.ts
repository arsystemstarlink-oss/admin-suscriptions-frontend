import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  PUSH_MESSAGE_TYPE,
  PUSH_NAVIGATE_TYPE,
  getInvalidationKeys,
  toAppPath,
  type PushMessageData,
} from '@/lib/push-sync'

interface ServiceWorkerPushMessage {
  type?: string
  data?: PushMessageData
  url?: string
  title?: string
  body?: string
  /** `false` cuando el service worker no mostró notificación del sistema. */
  shown?: boolean
  /** Esta pestaña es la que el usuario tiene en pantalla. */
  inFront?: boolean
}

/**
 * Escucha los avisos reenviados por el service worker: refresca únicamente las
 * consultas afectadas por el push (sin polling), muestra el aviso dentro de la
 * app cuando está en pantalla y abre la sección al tocar una notificación.
 */
export function usePushSync(navigate: (path: string) => void): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent<ServiceWorkerPushMessage>) => {
      const message = event.data
      if (!message) return

      if (message.type === PUSH_NAVIGATE_TYPE) {
        const path = toAppPath(message.url)
        if (path) navigate(path)
        return
      }

      const keys = getInvalidationKeys(message)
      for (const queryKey of keys) {
        queryClient.invalidateQueries({ queryKey })
      }

      // En primer plano el usuario debe recibir feedback dentro de la app. En
      // Safari el service worker puede mostrar además el aviso del sistema,
      // pero eso no sustituye al toast contextual.
      if (message.type !== PUSH_MESSAGE_TYPE || !message.inFront) return
      if (!message.title) return

      const path = toAppPath(message.data?.url)
      // Si ya está en esa sección, la lista se actualiza sola: el aviso sobra.
      const pageOf = (value: string | null) => value?.split(/[?#]/)[0]
      if (path && pageOf(toAppPath(window.location.href)) === pageOf(path)) return

      toast(message.title, {
        description: message.body,
        action: path ? { label: 'Ver', onClick: () => navigate(path) } : undefined,
      })
    }

    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => {
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [queryClient, navigate])
}
