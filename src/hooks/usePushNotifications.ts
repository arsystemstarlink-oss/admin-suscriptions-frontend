import { useCallback, useEffect, useState } from 'react'
import { pushApi } from '@/api/push.api'
import { getErrorHandler } from '@/lib/error-handler'
import type { ErrorCode } from '@/types/api'
import {
  createPushSubscription,
  getNotificationPermission,
  getPushSubscription,
  getServiceWorkerRegistration,
  isPushSupported,
  removePushSubscription,
} from '@/lib/push'

interface UsePushNotificationsReturn {
  supported: boolean
  permission: NotificationPermission | null
  subscribed: boolean
  checking: boolean
  toggling: boolean
  sendingTest: boolean
  error: string | null
  enable: () => Promise<boolean>
  disable: () => Promise<boolean>
  sendTest: () => Promise<boolean>
  refresh: () => Promise<void>
}

function resolveErrorMessage(error: unknown, fallback: string): string {
  const apiError = error as { code?: string; message?: string }
  if (apiError?.code) {
    return apiError.message || getErrorHandler(apiError.code as ErrorCode).message
  }
  if (error instanceof Error) return error.message
  return fallback
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [supported] = useState(() => isPushSupported())
  const [permission, setPermission] = useState<NotificationPermission | null>(() =>
    getNotificationPermission(),
  )
  const [subscribed, setSubscribed] = useState(false)
  const [checking, setChecking] = useState(false)
  const [toggling, setToggling] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supported) {
      setSubscribed(false)
      return
    }
    setChecking(true)
    setError(null)
    try {
      const registration = await getServiceWorkerRegistration()
      if (!registration) {
        setSubscribed(false)
        setError(
          'Las notificaciones necesitan el service worker activo. Abre la app instalada (PWA) o una versión compilada.',
        )
        return
      }

      const subscription = await registration.pushManager.getSubscription()
      if (!subscription) {
        setSubscribed(false)
        return
      }

      const { subscriptions } = await pushApi.listSubscriptions()
      if (subscriptions.some((entry) => entry.endpoint === subscription.endpoint)) {
        setSubscribed(true)
        return
      }

      try {
        await pushApi.register(subscription)
        setSubscribed(true)
      } catch (err) {
        setSubscribed(false)
        setError(resolveErrorMessage(err, 'No se pudo registrar la suscripción en el servidor'))
      }
    } catch (err) {
      setSubscribed(false)
      setError(resolveErrorMessage(err, 'No se pudo verificar el estado de las notificaciones'))
    } finally {
      setChecking(false)
    }
  }, [supported])

  useEffect(() => {
    refresh()
  }, [refresh])

  useEffect(() => {
    if (!supported || !('permissions' in navigator)) return

    let permissionStatus: PermissionStatus | null = null
    navigator.permissions
      .query({ name: 'notifications' as PermissionName })
      .then((status) => {
        permissionStatus = status
        status.onchange = () => {
          const current = getNotificationPermission()
          setPermission(current)
          if (current === 'granted') {
            refresh()
          } else if (current === 'denied') {
            setSubscribed(false)
          }
        }
      })
      .catch(() => {})

    return () => {
      if (permissionStatus) {
        permissionStatus.onchange = null
      }
    }
  }, [supported, refresh])

  const enable = useCallback(async () => {
    if (!supported) return false
    setToggling(true)
    setError(null)
    try {
      const result = await Notification.requestPermission()
      setPermission(result)
      if (result !== 'granted') {
        throw new Error('Permiso denegado. Habilita las notificaciones desde tu navegador.')
      }

      const subscription = await createPushSubscription()
      await pushApi.register(subscription)
      setSubscribed(true)
      return true
    } catch (err) {
      setError(resolveErrorMessage(err, 'No se pudieron activar las notificaciones'))
      return false
    } finally {
      setToggling(false)
    }
  }, [supported])

  const disable = useCallback(async () => {
    if (!supported) return false
    setToggling(true)
    setError(null)
    try {
      const subscription = await getPushSubscription()
      if (subscription) {
        try {
          await pushApi.unregister(subscription.endpoint)
        } catch {
          // La suscripción pudo ser eliminada del servidor previamente
        }
        await removePushSubscription()
      }
      setSubscribed(false)
      return true
    } catch (err) {
      setError(resolveErrorMessage(err, 'No se pudieron desactivar las notificaciones'))
      return false
    } finally {
      setToggling(false)
    }
  }, [supported])

  const sendTest = useCallback(async () => {
    setSendingTest(true)
    setError(null)
    try {
      await pushApi.sendTest()
      return true
    } catch (err) {
      setError(resolveErrorMessage(err, 'No se pudo enviar la notificación de prueba'))
      return false
    } finally {
      setSendingTest(false)
    }
  }, [])

  return {
    supported,
    permission,
    subscribed,
    checking,
    toggling,
    sendingTest,
    error,
    enable,
    disable,
    sendTest,
    refresh,
  }
}
