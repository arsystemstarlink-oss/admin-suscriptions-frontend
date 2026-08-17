import { useState } from 'react'
import {
  Bell,
  BellOff,
  CheckCircle2,
  Globe,
  Smartphone,
  Send,
  Server,
  XCircle,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePushNotifications } from '@/hooks/usePushNotifications'
import { isStandalone } from '@/lib/push'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SectionHeader } from '@/components/design-system'

const permissionLabels: Record<NotificationPermission, string> = {
  granted: 'Permiso concedido',
  default: 'Permiso no solicitado',
  denied: 'Permiso denegado',
}

export function NotificationsPage() {
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
    <div className="space-y-4 md:space-y-6">
      <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
        <CardHeader className="p-5">
          <SectionHeader
            title="Notificaciones"
            icon={<Bell className="h-5 w-5" />}
          />
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <p className="text-sm text-primary-500 dark:text-primary-400">
            Recibe alertas en este dispositivo aunque la app esté cerrada: vencimientos de
            suscripciones, pagos pendientes y mensajes entrantes.
          </p>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-primary-600 dark:text-primary-300 shrink-0" />
                <p className="text-sm text-primary-500 dark:text-primary-400">Navegador</p>
              </div>
              <div className="mt-2">
                {supported ? (
                  <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                    Soportado
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1 shrink-0" />
                    No soportado
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-primary-600 dark:text-primary-300 shrink-0" />
                <p className="text-sm text-primary-500 dark:text-primary-400">Permiso del navegador</p>
              </div>
              <div className="mt-2">
                {permission ? (
                  <Badge
                    className={
                      permission === 'granted'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : permission === 'denied'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    }
                  >
                    {permission === 'granted' && <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />}
                    {permissionLabels[permission]}
                  </Badge>
                ) : (
                  <p className="text-xs text-primary-500 dark:text-primary-400">—</p>
                )}
              </div>
            </div>

            <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
              <div className="flex items-center gap-2">
                <Server className="h-4 w-4 text-primary-600 dark:text-primary-300 shrink-0" />
                <p className="text-sm text-primary-500 dark:text-primary-400">Servidor</p>
              </div>
              <div className="mt-2">
                {supported && (
                  <Badge
                    className={
                      subscribed
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-primary-800/50 dark:text-primary-200'
                    }
                  >
                    {subscribed ? 'Notificaciones activas' : 'Inactivas'}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="mt-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {supported && subscribed ? (
              <>
                <Button variant="destructive" onClick={handleDisable} disabled={toggling}>
                  <BellOff className="h-4 w-4 mr-1 shrink-0" />
                  {toggling ? 'Desactivando...' : 'Desactivar notificaciones'}
                </Button>
                <Button variant="outline" onClick={handleTest} disabled={sendingTest}>
                  <Send className="h-4 w-4 mr-1 shrink-0" />
                  {sendingTest ? 'Enviando...' : 'Enviar notificación de prueba'}
                </Button>
              </>
            ) : (
              supported && (
                <Button onClick={handleEnable} disabled={toggling || permission === 'denied'}>
                  <Bell className="h-4 w-4 mr-1 shrink-0" />
                  {toggling ? 'Activando...' : 'Activar notificaciones'}
                </Button>
              )
            )}
            {supported && (
              <Button variant="ghost" onClick={refresh} disabled={checking}>
                <RefreshCw className={`h-4 w-4 mr-1 shrink-0 ${checking ? 'animate-spin' : ''}`} />
                Verificar estado
              </Button>
            )}
          </div>

          {permission === 'denied' && (
            <p className="mt-3 text-sm text-red-700 dark:text-red-400">
              El permiso fue denegado. Habilítalo desde la configuración de tu navegador y vuelve a
              intentar.
            </p>
          )}

          {supported && !subscribed && !isStandaloneApp && (
            <div className="mt-6 rounded-xl bg-secondary-600/15 dark:bg-secondary-500/10 px-4 py-3 text-sm text-primary-800 dark:text-primary-100">
              <p className="font-medium">En iPhone/iPad (iOS 16.4+)</p>
              <p className="mt-1 text-primary-600 dark:text-primary-300">
                Las notificaciones solo funcionan si la app está instalada: toca Compartir{' '}
                <span className="font-semibold">→</span> Añadir a pantalla de inicio, y luego
                actívalas desde aquí.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
        <CardHeader className="p-5">
          <SectionHeader
            title="Cómo funciona"
            icon={<BellOff className="h-5 w-5" />}
          />
        </CardHeader>
        <CardContent className="p-5 pt-0">
          <ul className="space-y-3 text-sm text-primary-500 dark:text-primary-400">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <span className="font-medium text-primary-700 dark:text-primary-200">Android:</span>{' '}
                instala la app desde Chrome (Añadir a pantalla de inicio) y activa las
                notificaciones.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <span className="font-medium text-primary-700 dark:text-primary-200">iPhone/iPad:</span>{' '}
                requiere iOS 16.4+ y la app instalada en pantalla de inicio.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                <span className="font-medium text-primary-700 dark:text-primary-200">Computadora:</span>{' '}
                funciona en Chrome, Edge y Firefox con la app abierta o cerrada.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
              <span>
                Las notificaciones se reciben incluso con la app cerrada; al tocarlas, la app se
                abre en la sección correspondiente.
              </span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
