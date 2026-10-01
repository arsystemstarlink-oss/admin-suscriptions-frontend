import { useState, useEffect } from 'react'
import { useSchedulerConfig, useUpdateSchedulerConfig, useRunScheduler, useSchedulerLogs } from '@/hooks/useScheduler'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
  Pause,
  AlertTriangle,
  History,
  Timer,
  SkipForward,
} from 'lucide-react'
import { formatDate } from '@/lib/constants'
import type { NotificationFailure, NotificationType, SchedulerLog } from '@/types/api'

const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  reminder: 'Recordatorio',
  'suspension-warning': 'Advertencia de suspensión',
  'suspended-notice': 'Aviso de suspensión',
}

const LOG_STATUS: Record<SchedulerLog['status'], { label: string; className: string }> = {
  success: {
    label: 'Éxito',
    className:
      'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900',
  },
  error: {
    label: 'Error',
    className:
      'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900',
  },
  skipped: {
    label: 'Omitido',
    className:
      'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900',
  },
}

const LOG_TRIGGERED_BY: Record<SchedulerLog['triggeredBy'], string> = {
  scheduled: 'Automático',
  manual: 'Manual',
}

const STATUS_ICON: Record<SchedulerLog['status'], typeof CheckCircle> = {
  success: CheckCircle,
  error: XCircle,
  skipped: SkipForward,
}

function formatLogTime(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const totalSeconds = Math.floor(ms / 1000)
  if (totalSeconds < 60) return `${totalSeconds}.${Math.floor((ms % 1000) / 100)}s`
  const minutes = Math.floor(totalSeconds / 60)
  return `${minutes}m ${totalSeconds % 60}s`
}

function LogStat({ label, value, alert = false }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="rounded-lg bg-slate-50 dark:bg-primary-950/50 border border-primary-100 dark:border-primary-800 p-2 text-center">
      <p
        className={`text-sm font-semibold leading-none ${
          alert ? 'text-red-600 dark:text-red-400' : 'text-primary-900 dark:text-primary-50'
        }`}
      >
        {value}
      </p>
      <p className="text-[10px] uppercase tracking-wide text-primary-500 dark:text-primary-400 mt-1">{label}</p>
    </div>
  )
}

function parseCronToTime(cron: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const fallback = { hour12: 8, minute: 30, period: 'AM' as const }
  const parts = cron.trim().split(/\s+/)
  if (parts.length !== 5) return fallback

  const minute = Number(parts[0])
  const hour24 = Number(parts[1])
  if (!Number.isInteger(minute) || minute < 0 || minute > 59) return fallback
  if (!Number.isInteger(hour24) || hour24 < 0 || hour24 > 23) return fallback

  const period: 'AM' | 'PM' = hour24 >= 12 ? 'PM' : 'AM'
  const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24

  return { hour12, minute, period }
}

function timeToCron(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  let hour24 = hour12
  if (period === 'AM') {
    hour24 = hour12 === 12 ? 0 : hour12
  } else {
    hour24 = hour12 === 12 ? 12 : hour12 + 12
  }
  return `${minute} ${hour24} * * *`
}

function formatTimeDisplay(hour12: number, minute: number, period: 'AM' | 'PM'): string {
  return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`
}

export function AdminToolsPage() {
  const [selectedHour12, setSelectedHour12] = useState(8)
  const [selectedMinute, setSelectedMinute] = useState(30)
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM')
  const isSuperAdmin = useIsSuperAdmin()
  const { selectedOrganizationId } = useOrganizationStore()

  const { data: schedulerConfig, isLoading: isLoadingScheduler } = useSchedulerConfig(
    isSuperAdmin ? selectedOrganizationId || undefined : undefined,
    { enabled: !isSuperAdmin || !!selectedOrganizationId }
  )
  const updateSchedulerMutation = useUpdateSchedulerConfig(isSuperAdmin ? selectedOrganizationId || undefined : undefined)
  const runSchedulerMutation = useRunScheduler(isSuperAdmin ? selectedOrganizationId || undefined : undefined)
  const { data: schedulerLogs, isLoading: isLoadingLogs } = useSchedulerLogs(
    50,
    isSuperAdmin ? selectedOrganizationId || undefined : undefined,
    { enabled: !isSuperAdmin || !!selectedOrganizationId }
  )

  const cronSchedule = timeToCron(selectedHour12, selectedMinute, selectedPeriod)
  const missingCron = !cronSchedule || cronSchedule === '* * * * *'

  const [runErrors, setRunErrors] = useState<NotificationFailure[] | null>(null)

  const cronScheduleFromServer = schedulerConfig?.cronSchedule

  const serverTime = cronScheduleFromServer ? parseCronToTime(cronScheduleFromServer) : null

  useEffect(() => {
    if (cronScheduleFromServer) {
      const { hour12, minute, period } = parseCronToTime(cronScheduleFromServer)
      setSelectedHour12(hour12)
      setSelectedMinute(minute)
      setSelectedPeriod(period)
    }
  }, [cronScheduleFromServer])

  const handleUpdateScheduler = async () => {
    if (missingCron) return
    await updateSchedulerMutation.mutateAsync({ cronSchedule })
  }

  const handleToggleScheduler = async (enabled: boolean) => {
    if (missingCron) return
    await updateSchedulerMutation.mutateAsync({ enabled })
  }

  const handleRunScheduler = async () => {
    if (missingCron) return
    const data = await runSchedulerMutation.mutateAsync()
    if (data.result?.errors?.length) {
      setRunErrors(data.result.errors)
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">

      {isSuperAdmin && !selectedOrganizationId && (
        <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-900 flex items-start gap-3">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>Selecciona una organización para configurar el programador de tareas.</span>
        </div>
      )}

      {(!isSuperAdmin || selectedOrganizationId) && (
        <>
          {missingCron && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-2xl dark:text-red-400 dark:bg-red-950/50 dark:border-red-900 flex items-start gap-3">
              <span className="shrink-0 mt-0.5">⚠️</span>
              <span>Configura un horario de ejecución antes de activar o guardar el programador.</span>
            </div>
          )}

          {isLoadingScheduler ? (
            <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
              <CardContent className="py-12 text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-primary-400 mx-auto mb-3 shrink-0" />
                <p className="text-primary-500 dark:text-primary-400">Cargando configuración...</p>
              </CardContent>
            </Card>
          ) : schedulerConfig ? (
            <>
              <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
                      <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-800 shrink-0">
                        <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-primary-600 dark:text-primary-300" />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-lg sm:text-xl">Tarea Diaria</CardTitle>
                        <CardDescription className="text-xs sm:text-sm mt-0.5">
                          Evalúa vencimientos y suspende suscripciones automáticamente
                        </CardDescription>
                      </div>
                    </div>
                    <Badge
                      className={`w-fit shrink-0 text-xs sm:text-sm px-2.5 py-1 sm:px-3 sm:py-1.5 ${
                        schedulerConfig.enabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900'
                          : 'bg-primary-100 text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-400 dark:border-primary-700'
                      }`}
                    >
                      {schedulerConfig.enabled ? (
                        <span className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 shrink-0" />
                          Activo
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 shrink-0" />
                          Desactivado
                        </span>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0 space-y-5 sm:space-y-6">
                  <div className="grid grid-cols-3 gap-2 sm:gap-4">
                    <div className="p-3 sm:p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                      <p className="text-xs text-primary-500 dark:text-primary-400 mb-1">Horario</p>
                      <p className="text-base font-semibold text-primary-900 dark:text-primary-50">
                        {serverTime
                          ? formatTimeDisplay(serverTime.hour12, serverTime.minute, serverTime.period)
                          : formatTimeDisplay(selectedHour12, selectedMinute, selectedPeriod)}
                      </p>
                      <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                        Diario
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                      <p className="text-xs text-primary-500 dark:text-primary-400 mb-1">Última ejecución</p>
                      <p className="text-base font-semibold text-primary-900 dark:text-primary-50">
                        {schedulerConfig.lastRun ? formatDate(schedulerConfig.lastRun) : 'Nunca'}
                      </p>
                      {schedulerConfig.lastRun && (
                        <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                          {getTimeAgo(schedulerConfig.lastRun)}
                        </p>
                      )}
                    </div>

                    <div className="p-3 sm:p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                      <p className="text-xs text-primary-500 dark:text-primary-400 mb-1">Estado</p>
                      <p className="text-base font-semibold text-primary-900 dark:text-primary-50">
                        {schedulerConfig.enabled ? 'Automático' : 'Manual'}
                      </p>
                      <p className="text-xs text-primary-500 dark:text-primary-400 mt-1">
                        {schedulerConfig.enabled
                          ? 'Por horario'
                          : 'Solo manual'}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-primary-100 dark:border-primary-800 pt-5 sm:pt-6 space-y-5 sm:space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Pause className="h-5 w-5 text-primary-600 dark:text-primary-300 shrink-0" />
                        <h3 className="font-semibold text-base">Control del Programador</h3>
                      </div>
                  <Button
                    variant={schedulerConfig.enabled ? 'destructive' : 'default'}
                    onClick={() => handleToggleScheduler(!schedulerConfig.enabled)}
                    disabled={updateSchedulerMutation.isPending || missingCron}
                    className="w-full sm:w-auto sm:min-w-35"
                  >
                        {schedulerConfig.enabled ? 'Desactivar' : 'Activar'}
                      </Button>
                      <p className="text-sm text-primary-500 dark:text-primary-400">
                        {schedulerConfig.enabled
                          ? 'El sistema evaluará vencimientos automáticamente según el horario configurado'
                          : 'El sistema no ejecutará evaluaciones automáticas. Puedes ejecutarlas manualmente'}
                      </p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary-600 dark:text-primary-300 shrink-0" />
                        <h3 className="font-semibold text-base">Horario de Ejecución</h3>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                    <Select
                      value={selectedHour12.toString()}
                      onValueChange={(v) => setSelectedHour12(Number(v))}
                    >
                      <SelectTrigger className="w-full bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800">
                        <SelectValue placeholder="Hora" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={selectedMinute.toString()} onValueChange={(v) => setSelectedMinute(Number(v))}>
                      <SelectTrigger className="w-full bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800">
                        <SelectValue placeholder="Min" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 60 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={selectedPeriod}
                      onValueChange={(v) => {
                        if (v === 'AM' || v === 'PM') setSelectedPeriod(v)
                      }}
                    >
                      <SelectTrigger className="w-full bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800">
                        <SelectValue placeholder="AM/PM" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="AM">AM</SelectItem>
                        <SelectItem value="PM">PM</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleUpdateScheduler}
                    disabled={updateSchedulerMutation.isPending || missingCron}
                    className="w-full"
                  >
                        {updateSchedulerMutation.isPending ? 'Guardando...' : 'Guardar'}
                      </Button>
                      <p className="text-xs text-primary-500 dark:text-primary-400">
                        Se ejecutará diariamente a la hora seleccionada
                      </p>
                    </div>

                    <div className="border-t border-primary-100 dark:border-primary-800 pt-5 space-y-3">
                      <div className="flex items-center gap-2">
                        <Zap className="h-5 w-5 text-primary-600 dark:text-primary-300 shrink-0" />
                        <h3 className="font-semibold text-base">Ejecución Manual</h3>
                      </div>
                    <Button
                      variant="outline"
                      onClick={handleRunScheduler}
                      disabled={runSchedulerMutation.isPending || missingCron}
                      className="w-full sm:w-auto"
                    >
                        {runSchedulerMutation.isPending ? 'Ejecutando...' : 'Ejecutar Ahora'}
                      </Button>
                      <p className="text-sm text-primary-500 dark:text-primary-400">
                        Ejecuta la Tarea Diaria inmediatamente, sin importar el estado del scheduler
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
                <CardHeader className="p-4 sm:p-5">
                  <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
                    <div className="h-10 w-10 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-800 shrink-0">
                      <History className="h-5 w-5 sm:h-7 sm:w-7 text-primary-600 dark:text-primary-300" />
                    </div>
                    <div className="min-w-0">
                      <CardTitle className="text-lg sm:text-xl">Historial de Ejecuciones</CardTitle>
                      <CardDescription className="text-xs sm:text-sm mt-0.5">
                        {schedulerLogs?.total
                          ? `Últimas ${schedulerLogs.logs.length} de ${schedulerLogs.total} ejecuciones`
                          : 'Ejecuciones registradas de la Tarea Diaria'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                  {isLoadingLogs ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="h-6 w-6 animate-spin text-primary-400 shrink-0" />
                    </div>
                  ) : !schedulerLogs || schedulerLogs.logs.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-sm text-primary-500 dark:text-primary-400">
                        Sin ejecuciones registradas todavía.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {schedulerLogs.logs.map((log) => {
                        const StatusIcon = STATUS_ICON[log.status]
                        return (
                          <div
                            key={log.id}
                            className="p-3 sm:p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800"
                          >
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <Badge
                                  className={`w-fit shrink-0 text-xs px-2.5 py-1 ${LOG_STATUS[log.status].className}`}
                                >
                                  <span className="flex items-center gap-1.5">
                                    <StatusIcon className="h-3.5 w-3.5 shrink-0" />
                                    {LOG_STATUS[log.status].label}
                                  </span>
                                </Badge>
                                <Badge className="w-fit shrink-0 text-xs px-2.5 py-1 bg-primary-100 text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-400 dark:border-primary-700">
                                  {LOG_TRIGGERED_BY[log.triggeredBy]}
                                </Badge>
                                <span className="text-xs text-primary-500 dark:text-primary-400">
                                  {formatLogTime(log.startedAt)}
                                </span>
                              </div>
                              <span className="text-xs font-medium text-primary-600 dark:text-primary-300 flex items-center gap-1.5">
                                <Timer className="h-3.5 w-3.5 shrink-0" />
                                {formatDuration(log.durationMs)}
                              </span>
                            </div>

                            {log.error && (
                              <div className="mt-3 rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-2.5 text-xs text-red-700 dark:text-red-400 break-words">
                                {log.error}
                              </div>
                            )}

                            <div className="mt-3 grid grid-cols-2 sm:grid-cols-5 gap-2">
                              <LogStat label="Vencidos" value={log.overdue} alert={log.overdue > 0} />
                              <LogStat label="Generados" value={log.generated} />
                              <LogStat label="Suspendidos" value={log.suspended} alert={log.suspended > 0} />
                              <LogStat label="Notificaciones" value={log.notifications} />
                              <LogStat label="Errores notif." value={log.notificationErrors} alert={log.notificationErrors > 0} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
              <CardContent className="py-12 text-center">
                <XCircle className="h-8 w-8 text-red-400 dark:text-red-500 mx-auto mb-3 shrink-0" />
                <p className="text-red-600 dark:text-red-400">Error al cargar la configuración</p>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <Dialog open={!!runErrors} onOpenChange={(open) => { if (!open) setRunErrors(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
              Notificaciones con error
            </DialogTitle>
            <DialogDescription>
              {runErrors?.length ?? 0} notificación(es) fallaron al ejecutar la Tarea Diaria.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-[55dvh] overflow-y-auto pr-1">
            {runErrors?.map((err, index) => (
              <div
                key={index}
                className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 p-3 space-y-1"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-red-900 dark:text-red-100">{err.clientName}</p>
                  <span className="text-[11px] uppercase tracking-wide text-red-600 dark:text-red-400 shrink-0">
                    {NOTIFICATION_TYPE_LABELS[err.type] ?? err.type}
                  </span>
                </div>
                <p className="text-xs text-red-700 dark:text-red-400">{err.phone}</p>
                {err.errorCode && (
                  <p className="text-xs font-medium text-red-700 dark:text-red-400">
                    Código Twilio: {err.errorCode}
                  </p>
                )}
                <p className="text-xs text-red-700 dark:text-red-400 break-words">{err.errorMessage}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins} min`
  if (diffHours < 24) return `Hace ${diffHours}h`
  return `Hace ${diffDays}d`
}