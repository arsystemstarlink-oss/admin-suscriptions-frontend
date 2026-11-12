import { useCallback, useEffect, useState } from 'react'
import { pushApi, type PushSubscriptionInfo } from '@/api/push.api'
import { getErrorHandler } from '@/lib/error-handler'
import type { ErrorCode } from '@/types/api'
import {
  createPushSubscription,
  expectTestPush,
  getNotificationPermission,
  getPushSubscription,
  isPushSupported,
  removePushSubscription,
} from '@/lib/push'

interface UsePushNotificationsReturn {
  supported: boolean
  permission: NotificationPermission | null
  subscribed: boolean
  /** Dispositivos de la cuenta con notificaciones activas. */
  devices: PushSubscriptionInfo[]
  /** Endpoint de la suscripción de este dispositivo, si existe. */
  currentEndpoint: string | null
  checking: boolean
  toggling: boolean
  sendingTest: boolean
  removingEndpoint: string | null
  error: string | null
  enable: () => Promise<boolean>
  disable: () => Promise<boolean>
  sendTest: () => Promise<boolean>
  removeDevice: (endpoint: string) => Promise<boolean>
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
  const [devices, setDevices] = useState<PushSubscriptionInfo[]>([])
  const [currentEndpoint, setCurrentEndpoint] = useState<string | null>(null)
  // Empieza en true para no mostrar "inactivas" antes de la primera comprobación.
  const [checking, setChecking] = useState(supported)
  const [toggling, setToggling] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [removingEndpoint, setRemovingEndpoint] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!supported) {
      setSubscribed(false)
      return
    }
    setChecking(true)
    setError(null)
    try {
      const subscription = await getPushSubscription()
      setCurrentEndpoint(subscription?.endpoint ?? null)

      const { subscriptions } = await pushApi.listSubscriptions()
      setDevices(subscriptions)

      if (!subscription) {
        setSubscribed(false)
        return
      }

      if (subscriptions.some((entry) => entry.endpoint === subscription.endpoint)) {
        setSubscribed(true)
        return
      }

      try {
        const { subscription: registered } = await pushApi.register(subscription)
        setDevices((current) => [...current, registered])
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
      if (result === 'denied') {
        // La pantalla ya explica cómo volver a permitirlas; no hace falta otro error.
        return false
      }
      if (result !== 'granted') {
        throw new Error('Para activarlas, acepta el permiso que pide el navegador.')
      }

      const subscription = await createPushSubscription()
      const { subscription: registered } = await pushApi.register(subscription)
      setCurrentEndpoint(subscription.endpoint)
      setDevices((current) => [
        ...current.filter((entry) => entry.endpoint !== registered.endpoint),
        registered,
      ])
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
        setDevices((current) => current.filter((entry) => entry.endpoint !== subscription.endpoint))
      }
      setCurrentEndpoint(null)
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
      await expectTestPush()
      await pushApi.sendTest()
      return true
    } catch (err) {
      setError(resolveErrorMessage(err, 'No se pudo enviar la notificación de prueba'))
      return false
    } finally {
      setSendingTest(false)
    }
  }, [])

  const removeDevice = useCallback(async (endpoint: string) => {
    setRemovingEndpoint(endpoint)
    setError(null)
    try {
      await pushApi.unregister(endpoint)
      setDevices((current) => current.filter((entry) => entry.endpoint !== endpoint))
      return true
    } catch (err) {
      setError(resolveErrorMessage(err, 'No se pudo quitar el dispositivo'))
      return false
    } finally {
      setRemovingEndpoint(null)
    }
  }, [])

  return {
    supported,
    permission,
    subscribed,
    devices,
    currentEndpoint,
    checking,
    toggling,
    sendingTest,
    removingEndpoint,
    error,
    enable,
    disable,
    sendTest,
    removeDevice,
    refresh,
  }
}
