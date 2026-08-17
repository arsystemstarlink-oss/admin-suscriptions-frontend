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

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!isPushSupported()) return null
  const registration = await navigator.serviceWorker.ready
  return registration.pushManager.getSubscription()
}

export async function createPushSubscription(): Promise<PushSubscription> {
  if (!isPushSupported()) {
    throw new Error('Tu navegador no soporta notificaciones push')
  }

  const registration = await navigator.serviceWorker.ready
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
