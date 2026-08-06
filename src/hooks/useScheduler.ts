import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schedulerApi } from '@/api/scheduler.api'
import { qk } from '@/lib/query-keys'
import type { UpdateSchedulerConfigRequest } from '@/types/api'
import { toast } from 'sonner'

export function useSchedulerConfig() {
  return useQuery({
    queryKey: qk.scheduler.config,
    queryFn: () => schedulerApi.getConfig(),
  })
}

export function useUpdateSchedulerConfig() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: UpdateSchedulerConfigRequest) => schedulerApi.updateConfig(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scheduler.config })
      toast.success('Configuración del scheduler actualizada')
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string; message?: string }
      if (apiError.code === 'INVALID_CRON_EXPRESSION') {
        toast.error('La expresión cron no es válida')
      } else {
        toast.error('Error al actualizar la configuración')
      }
    },
  })
}

export function useRunScheduler() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => schedulerApi.runNow(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.scheduler.config })
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
      qc.invalidateQueries({ queryKey: qk.dashboard.summary })
      qc.invalidateQueries({ queryKey: qk.dashboard.alerts })
      toast.success('Daily Job ejecutado correctamente')
    },
    onError: () => {
      toast.error('Error al ejecutar el Daily Job')
    },
  })
}
