import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulerApi } from '@/api/scheduler.api'
import { qk } from '@/lib/query-keys'
import type { UpdateSchedulerConfigRequest } from '@/types/api'
import { toast } from 'sonner'

export function useSchedulerConfig(organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.scheduler.config, organizationId],
    queryFn: () => schedulerApi.getConfig(organizationId),
    ...options,
  })
}

export function useUpdateSchedulerConfig(organizationId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSchedulerConfigRequest) => schedulerApi.updateConfig(data, organizationId),
    onSuccess: (data) => {
      qc.setQueryData([...qk.scheduler.config, organizationId], data)
      qc.invalidateQueries({ queryKey: qk.scheduler.config })
      toast.success('Configuración del scheduler actualizada')
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string; message?: string }
      if (apiError.code === 'INVALID_CRON') {
        toast.error('La expresión cron no es válida')
      } else {
        toast.error(apiError.message || 'No se pudo actualizar la configuración')
      }
    },
  })
}

export function useRunScheduler(organizationId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => schedulerApi.runNow(organizationId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.scheduler.config })
      qc.invalidateQueries({ queryKey: qk.scheduler.logs })
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
      qc.invalidateQueries({ queryKey: qk.dashboard.summary })
      qc.invalidateQueries({ queryKey: qk.dashboard.alerts })

      const errorCount = data.result?.errors?.length ?? 0
      if (errorCount > 0) {
        toast.warning(
          `Tarea diaria ejecutada: ${data.result.overdue} vencidos, ${data.result.generated} generados, ` +
            `${data.result.suspended} suspendidos, ${data.result.notifications} notificaciones. ` +
            `${errorCount} notificación(es) con error.`
        )
      } else {
        toast.success('Tarea diaria ejecutada correctamente')
      }
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string; message?: string }
      if (apiError.code === 'JOB_ALREADY_RUNNING') {
        toast.warning('La tarea diaria ya está en ejecución para esta organización. Espera a que termine.')
      } else {
        toast.error(apiError.message || 'No se pudo ejecutar la tarea diaria')
      }
    },
  })
}

export function useSchedulerLogs(limit = 50, organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.scheduler.logs, limit, organizationId],
    queryFn: () => schedulerApi.getLogs(limit, organizationId),
    ...options,
  })
}
