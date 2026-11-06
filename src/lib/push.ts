import { pushApi } from '@/api/push.api'

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as { standalone?: boolean }).standalone === true
  )
}

export function getNotificationPermission(): NotificationPermission | null {
  if (!('Notification' in window)) return null
  return Notification.permission
}

export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(new ArrayBuffer(rawData.length))
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function getPublicVapidKey(): Promise<string | null> {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  if (envKey) return envKey
  try {
    const { vapidPublicKey } = await pushApi.getVapidPublicKey()
    return vapidPublicKey || null
  } catch {
    return null
  }
}

// La primera instalación descarga todo el precache: en móvil puede tardar varios segundos.
const SERVICE_WORKER_TIMEOUT_MS = 20_000

function serviceWorkerUnavailableMessage(): string {
  return import.meta.env.DEV
    ? 'El service worker está desactivado en desarrollo. Para probar las notificaciones usa npm run build y npm run preview.'
    : 'No se pudo activar el servicio de notificaciones. Recarga la app e inténtalo de nuevo.'
}

// registerSW registra el worker de forma asíncrona, así que getRegistration() puede
// no encontrar nada todavía en la primera carga. `ready` espera a que haya uno activo.
async function requireActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
    throw new Error(serviceWorkerUnavailableMessage())
  }

  let timeoutId: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error(serviceWorkerUnavailableMessage())),
          SERVICE_WORKER_TIMEOUT_MS,
        )
      }),
    ])
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await requireActiveServiceWorker()
  return registration.pushManager.getSubscription()
}

export async function createPushSubscription(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Tu navegador no soporta notificaciones push')
  }

  const registration = await requireActiveServiceWorker()
  const existing = await registration.pushManager.getSubscription()
  if (existing) return existing

  const vapidKey = await getPublicVapidKey()
  if (!vapidKey) {
    throw new Error('Las notificaciones no están configuradas en el servidor')
  }

  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(vapidKey),
  })
}

export async function removePushSubscription(): Promise<void> {
  const subscription = await getPushSubscription()
  if (subscription) {
    await subscription.unsubscribe()
  }
}
