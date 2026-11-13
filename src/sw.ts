/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope

self.skipWaiting()
clientsClaim()

precacheAndRoute(self.__WB_MANIFEST)

cleanupOutdatedCaches()

registerRoute(
  ({ request }) => request.mode === 'navigate',
  new NetworkFirst({
    cacheName: 'html-cache',
    networkTimeoutSeconds: 3,
  }),
)

// Tras pedir un aviso de prueba, se muestra aunque la app esté en pantalla.
const TEST_PUSH_WINDOW_MS = 30_000
let forceNotificationUntil = 0

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
  if (event.data && event.data.type === 'EXPECT_TEST_PUSH') {
    forceNotificationUntil = Date.now() + TEST_PUSH_WINDOW_MS
  }
})

// Safari revoca la suscripción si un push no muestra notificación del sistema.
const mustAlwaysNotify =
  /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) &&
  !/Chrome|Chromium|Edg|Firefox/.test(navigator.userAgent)

/** Los mensajes de un mismo chat se agrupan; el resto de avisos no se reemplazan entre sí. */
function getNotificationTag(data: Record<string, unknown> | undefined): string | undefined {
  if (!data) return undefined
  if (typeof data.tag === 'string' && data.tag) return data.tag
  if (data.type === 'whatsapp-message') {
    return typeof data.url === 'string' && data.url ? `whatsapp:${data.url}` : 'whatsapp'
  }
  return undefined
}

function parsePushPayload(event: PushEvent): {
  title: string
  body?: string
  icon?: string
  badge?: string
  data?: Record<string, unknown>
} {
  if (!event.data) return { title: 'A|R SYSTEM' }

  let parsed: unknown
  try {
    parsed = event.data.json()
  } catch {
    return { title: 'A|R SYSTEM', body: event.data.text() }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { title: 'A|R SYSTEM' }
  }

  const raw = parsed as Record<string, unknown>
  const notification =
    raw.notification && typeof raw.notification === 'object'
      ? (raw.notification as Record<string, unknown>)
      : raw

  const data =
    notification.data && typeof notification.data === 'object'
      ? (notification.data as Record<string, unknown>)
      : undefined

  return {
    title: typeof notification.title === 'string' ? notification.title : 'A|R SYSTEM',
    body: typeof notification.body === 'string' ? notification.body : undefined,
    icon: typeof notification.icon === 'string' ? notification.icon : 'pwa-192.png',
    badge: typeof notification.badge === 'string' ? notification.badge : 'pwa-192.png',
    data,
  }
}

self.addEventListener('push', (event) => {
  const { title, body, icon, badge, data } = parsePushPayload(event)

  event.waitUntil(
    (async () => {
      const windowClients = (await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })) as WindowClient[]

      // Con la app en pantalla el aviso se muestra dentro de ella, no en el sistema.
      const appInFront = windowClients.some(
        (client) => client.focused && client.visibilityState === 'visible',
      )
      const shown = mustAlwaysNotify || !appInFront || Date.now() < forceNotificationUntil

      if (shown) {
        const tag = getNotificationTag(data)
        await self.registration.showNotification(title, {
          body,
          icon,
          badge,
          data,
          ...(tag ? { tag, renotify: true } : {}),
        } as NotificationOptions)
      }

      // Reenvía el aviso a las pestañas abiertas para que la app invalide
      // solo las consultas afectadas, sin necesidad de hacer polling.
      for (const client of windowClients) {
        client.postMessage({
          type: 'PUSH_RECEIVED',
          data: data ?? {},
          title,
          body,
          shown,
          inFront: client.focused && client.visibilityState === 'visible',
        })
      }
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl =
    event.notification.data && typeof event.notification.data === 'object'
      ? (event.notification.data as Record<string, unknown>).url
      : undefined

  let url = self.location.origin
  if (typeof rawUrl === 'string' && rawUrl) {
    try {
      const parsed = new URL(rawUrl, self.location.origin)
      // Solo se permite abrir URLs del mismo origen; cualquier push que apunte
      // a otro origen se redirige al origen de la app.
      url = parsed.origin === self.location.origin ? parsed.toString() : self.location.origin
    } catch {
      url = self.location.origin
    }
  }

  event.waitUntil(
    (async () => {
      const windowClients = (await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })) as WindowClient[]

      const target =
        windowClients.find((client) => client.url === url) ??
        windowClients.find((client) => client.focused) ??
        windowClients.find((client) => client.visibilityState === 'visible') ??
        windowClients[0]

      if (!target) {
        await self.clients.openWindow(url)
        return
      }

      // La app navega con su router: sin recargar la página y respetando el aviso
      // de cambios sin guardar si hay un formulario a medias.
      if (target.url !== url) {
        target.postMessage({ type: 'PUSH_NAVIGATE', url })
      }
      await target.focus()
    })(),
  )
})
