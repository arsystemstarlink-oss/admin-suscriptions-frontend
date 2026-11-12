import { useEffect, useState } from 'react'
import {
  Bell,
  BellOff,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Loader2,
  MonitorSmartphone,
  RefreshCw,
  Share,
  TriangleAlert,
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { toast } from 'sonner'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { describeUserAgent, getPushPlatform, isStandalone, type PushPlatform } from '@/lib/push'
import { PUSH_MESSAGE_TYPE } from '@/lib/push-sync'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const permissionLabels: Record<NotificationPermission, string> = {
  granted: 'Concedido',
  default: 'Aún no solicitado',
  denied: 'Bloqueado',
}

const UNBLOCK_STEPS: Record<PushPlatform, string[]> = {
  ios: [
    'Abre Ajustes en tu iPhone o iPad y entra en Notificaciones.',
    'Busca esta app en la lista y activa "Permitir notificaciones".',
    'Vuelve aquí y toca "Ya las permití".',
  ],
  android: [
    'Mantén presionado el ícono de la app y toca "Información de la app" (o el candado junto a la dirección si usas Chrome).',
    'Entra en Notificaciones y actívalas.',
    'Vuelve aquí y toca "Ya las permití".',
  ],
  desktop: [
    'Haz clic en el ícono que está a la izquierda de la dirección de la página (candado o ajustes).',
    'En Notificaciones, elige "Permitir".',
    'Recarga la página y actívalas desde aquí.',
  ],
}

const TEST_TIMEOUT_MS = 12_000

type TestState = 'idle' | 'waiting' | 'received' | 'timeout'

export function NotificationSettings() {
  const {
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
  } = usePushNotifications()
  const [platform] = useState(() => getPushPlatform())
  const [isStandaloneApp] = useState(() => isStandalone())
  const [showHelp, setShowHelp] = useState(false)
  const [testState, setTestState] = useState<TestState>('idle')

  // Confirma que el aviso de prueba llegó de verdad a este dispositivo.
  useEffect(() => {
    if (testState !== 'waiting' || !('serviceWorker' in navigator)) return

    const handleMessage = (event: MessageEvent<{ type?: string }>) => {
      if (event.data?.type === PUSH_MESSAGE_TYPE) setTestState('received')
    }
    const timeoutId = setTimeout(() => setTestState('timeout'), TEST_TIMEOUT_MS)
    navigator.serviceWorker.addEventListener('message', handleMessage)
    return () => {
      clearTimeout(timeoutId)
      navigator.serviceWorker.removeEventListener('message', handleMessage)
    }
  }, [testState])

  const denied = permission === 'denied'
  const needsInstall = !supported && platform === 'ios' && !isStandaloneApp
  // Solo la primera comprobación oculta el interruptor; "Verificar" no lo hace parpadear.
  const [hasChecked, setHasChecked] = useState(!checking)
  useEffect(() => {
    if (!checking) setHasChecked(true)
  }, [checking])
  const loadingInitial = !hasChecked

  const statusLabel = loadingInitial
    ? 'Comprobando…'
    : needsInstall
      ? 'Instala la app para activarlas'
      : !supported
        ? 'No disponibles en este navegador'
        : denied
          ? 'Bloqueadas en este dispositivo'
          : subscribed
            ? 'Activas'
            : 'Desactivadas'

  const handleToggle = async () => {
    setTestState('idle')
    if (subscribed) {
      if (await disable()) toast.success('Notificaciones desactivadas')
    } else if (await enable()) {
      toast.success('Notificaciones activadas')
    }
  }

  const handleTest = async () => {
    setTestState('idle')
    if (await sendTest()) setTestState('waiting')
  }

  const handleRemoveDevice = async (endpoint: string) => {
    if (await removeDevice(endpoint)) toast.success('Dispositivo quitado')
  }

  const otherDevices = devices.filter((device) => device.endpoint !== currentEndpoint)
  const showSwitch = supported && !denied && !loadingInitial

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                subscribed ? 'bg-primary/10 text-primary-text' : 'bg-surface-muted text-muted-foreground',
              )}
            >
              {subscribed ? <Bell className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 id="push-switch-label" className="font-semibold text-lg">
                Notificaciones en este dispositivo
              </h2>
              <p
                className={cn(
                  'mt-1 flex items-center gap-1.5 text-sm',
                  subscribed ? 'text-success' : denied ? 'text-destructive' : 'text-muted-foreground',
                )}
                role="status"
              >
                {loadingInitial && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />}
                {subscribed && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />}
                {statusLabel}
              </p>
            </div>
            {showSwitch && (
              <button
                type="button"
                role="switch"
                aria-checked={subscribed}
                aria-labelledby="push-switch-label"
                disabled={toggling}
                onClick={handleToggle}
                className={cn(
                  'relative mt-1 inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-60',
                  // Área táctil de 44px sin agrandar el interruptor.
                  'before:absolute before:-inset-2 before:content-[""]',
                  subscribed ? 'bg-primary' : 'bg-border',
                )}
              >
                <span
                  className={cn(
                    'inline-block h-5 w-5 rounded-full bg-white shadow transition-transform',
                    subscribed ? 'translate-x-6' : 'translate-x-1',
                  )}
                />
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Recibe alertas de suscripciones próximas a vencer, pagos pendientes y mensajes entrantes,
            incluso cuando la app no está abierta.
          </p>

          {needsInstall && (
            <div className="rounded-xl border border-border-subtle bg-surface-muted px-3 py-3 text-sm sm:px-4">
              <p className="font-medium text-foreground">
                En iPhone y iPad las notificaciones solo funcionan con la app instalada
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                <li>
                  En Safari, toca Compartir{' '}
                  <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-hidden="true" />.
                </li>
                <li>Elige "Añadir a pantalla de inicio".</li>
                <li>Abre la app desde el nuevo ícono y vuelve a esta pantalla.</li>
              </ol>
              <p className="mt-2 text-xs text-muted-foreground">Requiere iOS 16.4 o posterior.</p>
            </div>
          )}

          {!supported && !needsInstall && (
            <div className="rounded-xl border border-border-subtle bg-surface-muted px-3 py-3 text-sm text-muted-foreground sm:px-4">
              Este navegador no permite notificaciones.
              {platform === 'ios'
                ? ' Actualiza tu iPhone o iPad a iOS 16.4 o posterior.'
                : ' Prueba con Chrome, Edge o Firefox actualizados.'}
            </div>
          )}

          {supported && denied && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/10 px-3 py-3 text-sm sm:px-4">
              <p className="flex items-center gap-2 font-medium text-foreground">
                <TriangleAlert className="h-4 w-4 shrink-0 text-destructive" />
                Las notificaciones están bloqueadas para esta app
              </p>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
                {UNBLOCK_STEPS[platform].map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => window.location.reload()}
              >
                Ya las permití
              </Button>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {supported && subscribed && (
            <div className="space-y-2">
              <Button
                variant="outline"
                onClick={handleTest}
                disabled={sendingTest || testState === 'waiting'}
                className="w-full sm:w-auto"
              >
                {sendingTest || testState === 'waiting' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Esperando el aviso…
                  </>
                ) : (
                  'Enviar aviso de prueba'
                )}
              </Button>
              <div aria-live="polite">
                {testState === 'received' && (
                  <p className="flex items-start gap-2 text-sm text-success">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      El aviso llegó a este dispositivo.{' '}
                      <span className="text-muted-foreground">
                        Si no lo viste, revisa que el modo No molestar o Concentración esté apagado.
                      </span>
                    </span>
                  </p>
                )}
                {testState === 'timeout' && (
                  <p className="flex items-start gap-2 text-sm text-warning">
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                      El aviso se envió, pero todavía no llega aquí.{' '}
                      <span className="text-muted-foreground">
                        Revisa tu conexión y que el sistema permita notificaciones de este navegador.
                        Si sigue sin llegar, desactívalas y vuelve a activarlas.
                      </span>
                    </span>
                  </p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {otherDevices.length > 0 && (
        <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
            <h2 className="flex items-center gap-2 font-semibold">
              <MonitorSmartphone className="h-5 w-5 shrink-0 text-muted-foreground" />
              Otros dispositivos con notificaciones
            </h2>
          </CardHeader>
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            <ul className="divide-y divide-border-subtle">
              {otherDevices.map((device) => (
                <li key={device.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {describeUserAgent(device.userAgent ?? '')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Activadas el {format(new Date(device.createdAt), "d 'de' MMM yyyy", { locale: es })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 text-destructive hover:text-destructive"
                    disabled={removingEndpoint === device.endpoint}
                    onClick={() => handleRemoveDevice(device.endpoint)}
                  >
                    {removingEndpoint === device.endpoint ? 'Quitando…' : 'Quitar'}
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
        <CardHeader className="p-3 sm:p-4">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-3 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => setShowHelp((current) => !current)}
            aria-expanded={showHelp}
            aria-controls="notification-help-content"
          >
            <span className="flex min-w-0 items-center gap-2">
              <HelpCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="font-semibold">Compatibilidad y ayuda</span>
            </span>
            {showHelp ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {showHelp && (
          <CardContent id="notification-help-content" className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
            <ul className="grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">Android:</span>{' '}
                  instala la app desde Chrome (Añadir a pantalla de inicio) y activa las
                  notificaciones.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">iPhone/iPad:</span>{' '}
                  requiere iOS 16.4+ y la app instalada en pantalla de inicio.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>
                  <span className="font-medium text-foreground">Computadora:</span>{' '}
                  funciona en Chrome, Edge y Firefox con la app abierta o cerrada.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>
                  Con la app en pantalla el aviso aparece dentro de ella; con la app cerrada llega
                  como notificación y al tocarla se abre la sección correspondiente.
                </span>
              </li>
            </ul>

            <div className="rounded-xl border border-border-subtle bg-surface-muted p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-foreground">Diagnóstico</p>
                {supported && (
                  <Button variant="ghost" size="sm" onClick={refresh} disabled={checking}>
                    <RefreshCw className={cn('mr-1 h-4 w-4 shrink-0', checking && 'animate-spin')} />
                    Verificar
                  </Button>
                )}
              </div>
              <dl className="mt-2 grid gap-1.5 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Navegador</dt>
                  <dd className="text-foreground">{supported ? 'Compatible' : 'No compatible'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Permiso</dt>
                  <dd className="text-foreground">
                    {permission ? permissionLabels[permission] : 'No disponible'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Registro en el servidor</dt>
                  <dd className="text-foreground">
                    {!supported ? 'No disponible' : subscribed ? 'Activo' : 'Inactivo'}
                  </dd>
                </div>
              </dl>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
