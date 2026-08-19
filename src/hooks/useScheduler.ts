import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulerApi } from '@/api/scheduler.api'
import { qk } from '@/lib/query-keys'
import type { UpdateSchedulerConfigRequest } from '@/types/api'
import { toast } from 'sonner'

export function useSchedulerConfig(organizationId?: string) {
  return useQuery({
    queryKey: [...qk.scheduler.config, organizationId],
    queryFn: () => schedulerApi.getConfig(organizationId),
  })
}

export function useUpdateSchedulerConfig(organizationId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSchedulerConfigRequest) => schedulerApi.updateConfig(data, organizationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scheduler.config })
      toast.success('Configuración del scheduler actualizada')
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string; message?: string }
      if (apiError.code === 'INVALID_CRON') {
        toast.error('La expresión cron no es válida')
      } else {
        toast.error(apiError.message || 'Error al actualizar la configuración')
      }
    },
  })
}

export function useRunScheduler(organizationId?: string) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => schedulerApi.runNow(organizationId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scheduler.config })
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
      qc.invalidateQueries({ queryKey: qk.dashboard.summary })
      qc.invalidateQueries({ queryKey: qk.dashboard.alerts })
      toast.success('Daily Job ejecutado correctamente')
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string; message?: string }
      if (apiError.code === 'JOB_ALREADY_RUNNING') {
        toast.warning('El Daily Job ya está en ejecución para esta organización. Espera a que termine.')
      } else {
        toast.error(apiError.message || 'Error al ejecutar el Daily Job')
      }
    },
  })
}
