import { useState, useEffect } from 'react'
import { useSchedulerConfig, useUpdateSchedulerConfig, useRunScheduler } from '@/hooks/useScheduler'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
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
    <div className="space-y-6">
      {isLoadingScheduler ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-3 shrink-0" />
            <p className="text-muted-foreground">Cargando configuración...</p>
          </CardContent>
        </Card>
      ) : schedulerConfig ? (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-14 w-14 rounded-xl flex items-center justify-center bg-muted">
                    <Clock className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Tarea Diaria</CardTitle>
                    <CardDescription className="mt-1">
                      Evalúa vencimientos y suspende suscripciones automáticamente
                    </CardDescription>
                  </div>
                </div>
                <Badge
                  className={`text-sm px-4 py-1.5 ${
                    schedulerConfig.enabled
                      ? 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800'
                      : 'bg-muted text-muted-foreground border-border'
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
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Horario</p>
                  <p className="text-lg font-semibold text-foreground">
                    {formatTimeDisplay(selectedHour12, selectedMinute, selectedPeriod)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Diario
                  </p>
                </div>

                <div className="p-4 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Última ejecución</p>
                  <p className="text-lg font-semibold text-foreground">
                    {schedulerConfig.lastRun ? formatDate(schedulerConfig.lastRun) : 'Nunca'}
                  </p>
                  {schedulerConfig.lastRun && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {getTimeAgo(schedulerConfig.lastRun)}
                    </p>
                  )}
                </div>

                <div className="p-4 bg-card rounded-lg border">
                  <p className="text-sm text-muted-foreground mb-1">Estado</p>
                  <p className="text-lg font-semibold text-foreground">
                    {schedulerConfig.enabled ? 'Automático' : 'Manual'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {schedulerConfig.enabled
                      ? 'Se ejecuta según horario'
                      : 'Solo ejecución manual'}
                  </p>
                </div>
              </div>

              <div className="border-t pt-6 space-y-5">
                <div>
                  <Label className="text-base font-semibold text-foreground mb-3 block">
                    Control del Programador
                  </Label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant={schedulerConfig.enabled ? 'destructive' : 'default'}
                      onClick={() => handleToggleScheduler(!schedulerConfig.enabled)}
                      disabled={updateSchedulerMutation.isPending}
                      className="gap-2 min-w-35"
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
                    <p className="text-sm text-muted-foreground">
                      {schedulerConfig.enabled
                        ? 'El sistema evaluará vencimientos automáticamente según el horario configurado'
                        : 'El sistema no ejecutará evaluaciones automáticas. Puedes ejecutarlas manualmente'}
                    </p>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold text-foreground mb-3 block">
                    Horario de Ejecución
                  </Label>
                  <div className="flex items-center gap-3">
                    <Select value={selectedHour12.toString()} onValueChange={(v) => setSelectedHour12(parseInt(v))}>
                      <SelectTrigger className="w-24">
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
                      <SelectTrigger className="w-24">
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
                      <SelectTrigger className="w-24">
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
                    >
                      {updateSchedulerMutation.isPending ? 'Guardando...' : 'Guardar'}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Se ejecutará diariamente a la hora seleccionada
                  </p>
                </div>

                <div className="border-t pt-5">
                  <Label className="text-base font-semibold text-foreground mb-3 block">
                    Ejecución Manual
                  </Label>
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      onClick={handleRunScheduler}
                      disabled={runSchedulerMutation.isPending}
                      className="gap-2"
                    >
                      <Zap className="h-4 w-4 shrink-0" />
                      {runSchedulerMutation.isPending ? 'Ejecutando...' : 'Ejecutar Ahora'}
                    </Button>
                    <p className="text-sm text-muted-foreground">
                      Ejecuta la Tarea Diaria inmediatamente, sin importar el estado del scheduler
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
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
