import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useSchedulerConfig, useUpdateSchedulerConfig, useRunScheduler } from '@/hooks/useScheduler'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Clock,
  CheckCircle,
  XCircle,
  Zap,
  RefreshCw,
  Pause,
  Building2,
} from 'lucide-react'
import { formatDate } from '@/lib/constants'

const ALL_ORGS_VALUE = '__all__'

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
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedHour12, setSelectedHour12] = useState(8)
  const [selectedMinute, setSelectedMinute] = useState(30)
  const [selectedPeriod, setSelectedPeriod] = useState<'AM' | 'PM'>('AM')
  const isSuperAdmin = useIsSuperAdmin()
  const organizationIdFilter = searchParams.get('organizationId') || undefined
  const { data: schedulerConfig, isLoading: isLoadingScheduler } = useSchedulerConfig(organizationIdFilter)
  const updateSchedulerMutation = useUpdateSchedulerConfig(organizationIdFilter)
  const runSchedulerMutation = useRunScheduler(organizationIdFilter)

  const { data: organizationsData } = useOrganizations(
    { limit: 100 },
    { enabled: isSuperAdmin },
  )
  const organizations = (organizationsData?.organizations || []).filter((org) => org.active)

  const requiresOrganization = isSuperAdmin && !organizationIdFilter

  const handleOrganizationFilter = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === ALL_ORGS_VALUE) {
      params.delete('organizationId')
    } else {
      params.set('organizationId', value)
    }
    setSearchParams(params)
  }

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

      {isSuperAdmin && (
        <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 p-4 shadow-sm flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-medium text-primary-800 dark:text-primary-200">
            <Building2 className="h-4 w-4 text-primary-400 shrink-0" />
            Organización
          </div>
          <Select value={organizationIdFilter || ALL_ORGS_VALUE} onValueChange={handleOrganizationFilter}>
            <SelectTrigger
              className="w-full sm:w-64 h-10 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700"
              aria-label="Seleccionar organización"
            >
              <SelectValue placeholder="Todas las organizaciones" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ORGS_VALUE}>Todas las organizaciones</SelectItem>
              {organizations.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {requiresOrganization && (
        <div className="p-4 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-2xl dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-900 flex items-start gap-3">
          <span className="shrink-0 mt-0.5">⚠️</span>
          <span>
            Seleccione una organización para habilitar el ejecutador de tareas.
          </span>
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
                    {formatTimeDisplay(selectedHour12, selectedMinute, selectedPeriod)}
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
                    disabled={updateSchedulerMutation.isPending || requiresOrganization}
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
                    <Select value={selectedHour12.toString()} onValueChange={(v) => setSelectedHour12(parseInt(v))} disabled={requiresOrganization}>
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
                    <Select value={selectedMinute.toString()} onValueChange={(v) => setSelectedMinute(parseInt(v))} disabled={requiresOrganization}>
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
                    <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as 'AM' | 'PM')} disabled={requiresOrganization}>
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
                    disabled={updateSchedulerMutation.isPending || requiresOrganization}
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
                    disabled={runSchedulerMutation.isPending || requiresOrganization}
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
