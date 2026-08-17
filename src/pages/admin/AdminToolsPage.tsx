import { useState, useEffect } from 'react'
import { useSchedulerConfig, useUpdateSchedulerConfig, useRunScheduler } from '@/hooks/useScheduler'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Play,
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
  Pause,
} from 'lucide-react'
import { formatDate } from '@/lib/constants'
import { SectionHeader } from '@/components/design-system/SectionHeader'

function parseCronToTime(cron: string): { hour12: number; minute: number; period: 'AM' | 'PM' } {
  const parts = cron.split(' ')
  if (parts.length !== 5) return { hour12: 8, minute: 30, period: 'AM' }
  
  const hour24 = parseInt(parts[1]) || 8
  const minute = parseInt(parts[0]) || 30
  
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
  const { data: schedulerConfig, isLoading: isLoadingScheduler } = useSchedulerConfig()
  const updateSchedulerMutation = useUpdateSchedulerConfig()
  const runSchedulerMutation = useRunScheduler()

  useEffect(() => {
    if (schedulerConfig?.cronSchedule) {
      const { hour12, minute, period } = parseCronToTime(schedulerConfig.cronSchedule)
      setSelectedHour12(hour12)
      setSelectedMinute(minute)
      setSelectedPeriod(period)
    }
  }, [schedulerConfig])

  const handleUpdateScheduler = async () => {
    const cron = timeToCron(selectedHour12, selectedMinute, selectedPeriod)
    await updateSchedulerMutation.mutateAsync({ cronSchedule: cron })
  }

  const handleToggleScheduler = async (enabled: boolean) => {
    await updateSchedulerMutation.mutateAsync({ enabled })
  }

  const handleRunScheduler = async () => {
    await runSchedulerMutation.mutateAsync()
  }

  return (
    <div className="space-y-4 md:space-y-6">

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
            <CardHeader className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-800 shrink-0">
                    <Clock className="h-6 w-6 sm:h-7 sm:w-7 text-primary-600 dark:text-primary-300" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-lg sm:text-xl">Tarea Diaria</CardTitle>
                    <CardDescription className="mt-1">
                      Evalúa vencimientos y suspende suscripciones automáticamente
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  className={`w-fit shrink-0 text-sm px-3 py-1.5 sm:px-4 ${
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
            <CardContent className="p-5 pt-0 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                  <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Horario</p>
                  <p className="text-lg font-semibold text-primary-900 dark:text-primary-50">
                    {formatTimeDisplay(selectedHour12, selectedMinute, selectedPeriod)}
                  </p>
                  <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
                    Diario
                  </p>
                </div>

                <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                  <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Última ejecución</p>
                  <p className="text-lg font-semibold text-primary-900 dark:text-primary-50">
                    {schedulerConfig.lastRun ? formatDate(schedulerConfig.lastRun) : 'Nunca'}
                  </p>
                  {schedulerConfig.lastRun && (
                    <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
                      {getTimeAgo(schedulerConfig.lastRun)}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                  <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Estado</p>
                  <p className="text-lg font-semibold text-primary-900 dark:text-primary-50">
                    {schedulerConfig.enabled ? 'Automático' : 'Manual'}
                  </p>
                  <p className="text-sm text-primary-500 dark:text-primary-400 mt-1">
                    {schedulerConfig.enabled
                      ? 'Se ejecuta según horario'
                      : 'Solo ejecución manual'}
                  </p>
                </div>
              </div>

              <div className="border-t border-primary-100 dark:border-primary-800 pt-6 space-y-5">
                <SectionHeader
                  title="Control del Programador"
                  icon={<Pause className="h-5 w-5" />}
                  action={
                    <Button
                      variant={schedulerConfig.enabled ? 'destructive' : 'default'}
                      onClick={() => handleToggleScheduler(!schedulerConfig.enabled)}
                      disabled={updateSchedulerMutation.isPending}
                      className="gap-2 w-full sm:w-auto sm:min-w-35 shrink-0"
                    >
                      {schedulerConfig.enabled ? (
                        <>
                          <Pause className="h-4 w-4 shrink-0" />
                          Desactivar
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4 shrink-0" />
                          Activar
                        </>
                      )}
                    </Button>
                  }
                />
                <p className="text-sm text-primary-500 dark:text-primary-400">
                  {schedulerConfig.enabled
                    ? 'El sistema evaluará vencimientos automáticamente según el horario configurado'
                    : 'El sistema no ejecutará evaluaciones automáticas. Puedes ejecutarlas manualmente'}
                </p>

                <SectionHeader
                  title="Horario de Ejecución"
                  icon={<Clock className="h-5 w-5" />}
                />
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                  <Select value={selectedHour12.toString()} onValueChange={(v) => setSelectedHour12(parseInt(v))}>
                    <SelectTrigger className="w-[4.5rem] sm:w-24 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800">
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
                  <Select value={selectedMinute.toString()} onValueChange={(v) => setSelectedMinute(parseInt(v))}>
                    <SelectTrigger className="w-[4.5rem] sm:w-24 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800">
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
                  <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'AM' | 'PM')}>
                    <SelectTrigger className="w-[4.5rem] sm:w-24 bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800">
                      <SelectValue placeholder="AM/PM" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AM">AM</SelectItem>
                      <SelectItem value="PM">PM</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleUpdateScheduler}
                    disabled={updateSchedulerMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    {updateSchedulerMutation.isPending ? 'Guardando...' : 'Guardar'}
                  </Button>
                </div>
                <p className="text-xs text-primary-500 dark:text-primary-400 mt-2">
                  Se ejecutará diariamente a la hora seleccionada
                </p>

                <div className="border-t border-primary-100 dark:border-primary-800 pt-5">
                  <SectionHeader
                    title="Ejecución Manual"
                    icon={<Zap className="h-5 w-5" />}
                    action={
                      <Button
                        variant="outline"
                        onClick={handleRunScheduler}
                        disabled={runSchedulerMutation.isPending}
                        className="gap-2 w-full sm:w-auto shrink-0"
                      >
                        <Zap className="h-4 w-4 shrink-0" />
                        {runSchedulerMutation.isPending ? 'Ejecutando...' : 'Ejecutar Ahora'}
                      </Button>
                    }
                  />
                  <p className="text-sm text-primary-500 dark:text-primary-400">
                    Ejecuta la Tarea Diaria inmediatamente, sin importar el estado del scheduler
                  </p>
                </div>
              </div>
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
