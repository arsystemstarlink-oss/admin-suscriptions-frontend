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
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary-600 dark:text-primary-300 shrink-0" />
            <h2 className="font-semibold text-lg">Notificaciones</h2>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0 space-y-4 sm:space-y-5">
          <p className="text-sm text-primary-500 dark:text-primary-400">
            Recibe alertas en este dispositivo aunque la app esté cerrada: vencimientos de
            suscripciones, pagos pendientes y mensajes entrantes.
          </p>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="p-3 sm:p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800 text-center">
              <Globe className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-300 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-primary-500 dark:text-primary-400">Navegador</p>
              <div className="mt-2 flex justify-center">
                {supported ? (
                  <Badge className="text-[10px] sm:text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />
                    <span className="hidden sm:inline">Soportado</span>
                    <span className="sm:hidden">OK</span>
                  </Badge>
                ) : (
                  <Badge variant="destructive" className="text-[10px] sm:text-xs">
                    <XCircle className="h-3 w-3 mr-1 shrink-0" />
                    No
                  </Badge>
                )}
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800 text-center">
              <Smartphone className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-300 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-primary-500 dark:text-primary-400">Permiso</p>
              <div className="mt-2 flex justify-center">
                {permission ? (
                  <Badge
                    className={`text-[10px] sm:text-xs ${
                      permission === 'granted'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : permission === 'denied'
                          ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400'
                    }`}
                  >
                    {permission === 'granted' && <CheckCircle2 className="h-3 w-3 mr-1 shrink-0" />}
                    <span className="hidden sm:inline">{permissionLabels[permission]}</span>
                    <span className="sm:hidden">
                      {permission === 'granted' ? 'OK' : permission === 'denied' ? 'Denegado' : 'Pendiente'}
                    </span>
                  </Badge>
                ) : (
                  <p className="text-xs text-primary-500 dark:text-primary-400">—</p>
                )}
              </div>
            </div>

            <div className="p-3 sm:p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800 text-center">
              <Server className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600 dark:text-primary-300 mx-auto mb-2" />
              <p className="text-xs sm:text-sm text-primary-500 dark:text-primary-400">Servidor</p>
              <div className="mt-2 flex justify-center">
                {supported && (
                  <Badge
                    className={`text-[10px] sm:text-xs ${
                      subscribed
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                        : 'bg-slate-100 text-slate-600 dark:bg-primary-800/50 dark:text-primary-200'
                    }`}
                  >
                    <span className="hidden sm:inline">{subscribed ? 'Notificaciones activas' : 'Inactivas'}</span>
                    <span className="sm:hidden">{subscribed ? 'Activas' : 'Inactivas'}</span>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
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
            <p className="text-sm text-red-700 dark:text-red-400">
              El permiso fue denegado. Habilítalo desde la configuración de tu navegador y vuelve a
              intentar.
            </p>
          )}

          {supported && !subscribed && !isStandaloneApp && (
            <div className="rounded-xl bg-secondary-600/15 dark:bg-secondary-500/10 px-3 py-2.5 sm:px-4 sm:py-3 text-sm text-primary-800 dark:text-primary-100">
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
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary-600 dark:text-primary-300 shrink-0" />
            <h2 className="font-semibold text-lg">Cómo funciona</h2>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
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
