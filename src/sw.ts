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

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

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
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      data,
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const rawUrl =
    event.notification.data && typeof event.notification.data === 'object'
      ? (event.notification.data as Record<string, unknown>).url
      : undefined

  const url =
    typeof rawUrl === 'string' && rawUrl
      ? new URL(rawUrl, self.location.origin).toString()
      : self.location.origin

  event.waitUntil(
    (async () => {
      const windowClients = (await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      })) as WindowClient[]

      for (const client of windowClients) {
        if (client.url === url) {
          await client.focus()
          return
        }
      }

      for (const client of windowClients) {
        await client.navigate(url)
        await client.focus()
        return
      }

      await self.clients.openWindow(url)
    })(),
  )
})
