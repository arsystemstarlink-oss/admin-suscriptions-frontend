import { useState } from 'react'
import {
  Bell,
  CheckCircle2,
  Globe,
  Smartphone,
  Server,
  XCircle,
  RefreshCw,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { isStandalone } from '@/lib/push'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const permissionLabels: Record<NotificationPermission, string> = {
  granted: 'Permiso concedido',
  default: 'Permiso no solicitado',
  denied: 'Permiso denegado',
}

export function NotificationSettings() {
  const {
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
  } = usePushNotifications()
  const [isStandaloneApp] = useState(() => isStandalone())
  const [showHelp, setShowHelp] = useState(false)

  const handleEnable = async () => {
    const ok = await enable()
    if (ok) {
      toast.success('Notificaciones activadas correctamente')
    } else {
      toast.error('No se pudieron activar las notificaciones')
    }
  }

  const handleDisable = async () => {
    const ok = await disable()
    if (ok) {
      toast.success('Notificaciones desactivadas')
    } else {
      toast.error('No se pudieron desactivar las notificaciones')
    }
  }

  const handleTest = async () => {
    const ok = await sendTest()
    if (ok) {
      toast.success('Notificación de prueba enviada')
    } else {
      toast.error('No se pudo enviar la notificación de prueba')
    }
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bell className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-lg">Notificaciones en este dispositivo</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Controla las alertas que recibes aquí.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Recibe alertas de suscripciones próximas a vencer, pagos pendientes y mensajes entrantes,
            incluso cuando la app no está abierta.
          </p>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 text-surface-muted-foreground sm:flex-col sm:justify-center sm:p-4 sm:text-center">
              <div className="flex min-w-0 items-center gap-2 sm:flex-col sm:gap-1.5">
                <Globe className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                <p className="text-sm font-medium text-foreground">Navegador</p>
              </div>
              <div className="flex shrink-0 justify-end sm:mt-1">
                {supported ? (
                  <Badge variant="outline" className="border-success/20 bg-success/10 text-xs text-success">
                    <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                    Soportado
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-xs">
                    <XCircle className="h-3 w-3 mr-1 shrink-0" />
                    No compatible
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 text-surface-muted-foreground sm:flex-col sm:justify-center sm:p-4 sm:text-center">
              <div className="flex min-w-0 items-center gap-2 sm:flex-col sm:gap-1.5">
                <Smartphone className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                <p className="text-sm font-medium text-foreground">Permiso</p>
              </div>
              <div className="flex shrink-0 justify-end sm:mt-1">
                {permission ? (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      permission === 'granted'
                        ? 'border-success/20 bg-success/10 text-success'
                        : permission === 'denied'
                          ? 'border-destructive/20 bg-destructive/10 text-destructive'
                          : 'border-warning/20 bg-warning/10 text-warning'
                    }`}
                  >
                    {permission === 'granted' && <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />}
                    {permissionLabels[permission]}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    No disponible
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 text-surface-muted-foreground sm:flex-col sm:justify-center sm:p-4 sm:text-center">
              <div className="flex min-w-0 items-center gap-2 sm:flex-col sm:gap-1.5">
                <Server className="h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
                <p className="text-sm font-medium text-foreground">Suscripción</p>
              </div>
              <div className="flex shrink-0 justify-end sm:mt-1">
                {supported ? (
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      subscribed
                        ? 'border-success/20 bg-success/10 text-success'
                        : 'border-border text-muted-foreground'
                    }`}
                  >
                    {subscribed ? 'Activas' : 'Inactivas'}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    No disponible
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-destructive/10 text-destructive px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 gap-2 sm:flex sm:items-center sm:gap-3">
            {supported && subscribed ? (
              <>
                <Button variant="destructive" onClick={handleDisable} disabled={toggling} className="w-full sm:w-auto">
                  {toggling ? 'Desactivando...' : 'Desactivar'}
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={sendingTest} className="w-full sm:w-auto">
                  {sendingTest ? 'Enviando...' : 'Enviar prueba'}
                </Button>
              </>
            ) : (
              supported && (
                <Button onClick={handleEnable} disabled={toggling || permission === 'denied'} className="w-full sm:w-auto">
                  {toggling ? 'Activando...' : 'Activar notificaciones'}
                </Button>
              )
            )}
            {supported && (
              <Button variant="ghost" onClick={refresh} disabled={checking} className="w-full sm:w-auto">
                <RefreshCw className={`h-4 w-4 mr-1 shrink-0 ${checking ? 'animate-spin' : ''}`} />
                Verificar
              </Button>
            )}
          </div>

          {permission === 'denied' && (
            <p className="text-sm text-destructive">
              El permiso fue denegado. Habilítalo desde la configuración de tu navegador y vuelve a
              intentar.
            </p>
          )}

          {supported && !subscribed && !isStandaloneApp && (
            <div className="rounded-xl bg-surface-muted px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-surface-muted-foreground border border-border-subtle">
              <p className="font-medium">En iPhone/iPad (iOS 16.4+)</p>
              <p className="mt-1 text-muted-foreground">
                Las notificaciones solo funcionan si la app está instalada: toca Compartir{' '}
                <span className="font-semibold">→</span> Añadir a pantalla de inicio, y luego
                actívalas desde aquí.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

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
          <CardContent id="notification-help-content" className="p-4 pt-0 sm:p-5 sm:pt-0">
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
                Las notificaciones se reciben incluso con la app cerrada; al tocarlas, la app se
                abre en la sección correspondiente.
              </span>
            </li>
          </ul>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
