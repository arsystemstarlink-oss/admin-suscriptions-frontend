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

const SERVICE_WORKER_TIMEOUT_MS = 8000

export async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (!('serviceWorker' in navigator)) return null
  const registration = await navigator.serviceWorker.getRegistration()
  return registration ?? null
}

async function requireActiveServiceWorker(): Promise<ServiceWorkerRegistration> {
  const registration = await getServiceWorkerRegistration()
  if (!registration) {
    throw new Error(
      'El service worker no está activo. Abre la app instalada (PWA) o una versión compilada para activar las notificaciones.',
    )
  }
  if (registration.active) return registration

  return Promise.race([
    navigator.serviceWorker.ready,
    new Promise<never>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              'El service worker no terminó de activarse. Recarga la app e inténtalo de nuevo.',
            ),
          ),
        SERVICE_WORKER_TIMEOUT_MS,
      )
    }),
  ])
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await getServiceWorkerRegistration()
  if (!registration) return null
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
