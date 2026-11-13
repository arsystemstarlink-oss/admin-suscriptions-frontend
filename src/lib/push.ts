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

export type PushPlatform = 'ios' | 'android' | 'desktop'

export function getPushPlatform(): PushPlatform {
  const ua = navigator.userAgent
  // iPadOS se identifica como Mac; se distingue por la pantalla táctil.
  if (/iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) {
    return 'ios'
  }
  if (/Android/.test(ua)) return 'android'
  return 'desktop'
}

/** Nombre legible del dispositivo a partir del user agent guardado en la suscripción. */
export function describeUserAgent(ua: string): string {
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /OPR\//.test(ua)
      ? 'Opera'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Chrome\//.test(ua)
          ? 'Chrome'
          : /Safari\//.test(ua)
            ? 'Safari'
            : 'Navegador'
  const system = /iPhone|iPod/.test(ua)
    ? 'iPhone'
    : /iPad/.test(ua)
      ? 'iPad'
      : /Android/.test(ua)
        ? 'Android'
        : /Windows/.test(ua)
          ? 'Windows'
          : /Macintosh|Mac OS X/.test(ua)
            ? 'Mac'
            : /Linux/.test(ua)
              ? 'Linux'
              : ''
  return system ? `${browser} en ${system}` : browser
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

/**
 * Al cerrar sesión este dispositivo deja de recibir avisos de la cuenta.
 * Recibe el token porque para entonces ya se borró del storage.
 */
export async function detachPushOnLogout(accessToken: string | null): Promise<void> {
  if (!isPushSupported()) return
  try {
    if ('clearAppBadge' in navigator) {
      navigator.clearAppBadge().catch(() => {})
    }
    const registration = await navigator.serviceWorker.getRegistration()
    const subscription = await registration?.pushManager.getSubscription()
    if (!subscription) return
    if (accessToken) {
      await pushApi.unregisterOnLogout(subscription.endpoint, accessToken).catch(() => {})
    }
    // Aunque el servidor no responda, sin suscripción local no llega ningún aviso.
    await subscription.unsubscribe()
  } catch {
    // Sin service worker no hay nada que desvincular
  }
}

/** Pide al service worker mostrar el próximo aviso aunque la app esté en pantalla. */
export async function expectTestPush(): Promise<void> {
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    registration?.active?.postMessage({ type: 'EXPECT_TEST_PUSH' })
  } catch {
    // El aviso de prueba se mostrará dentro de la app
  }
}
