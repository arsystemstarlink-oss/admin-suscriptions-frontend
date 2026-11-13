import { useState } from 'react'
import { useDeletePlan } from '@/hooks/usePlans'
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-handler'

interface DeletePlanSheetProps {
  planId: string
  planName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePlanSheet({ planId, planName, open, onOpenChange }: DeletePlanSheetProps) {
  const deleteMutation = useDeletePlan()
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  const handleDelete = async () => {
    setError(null)

    try {
      await deleteMutation.mutateAsync(planId)
      toast.success('Plan eliminado correctamente')
      onOpenChange(false)
    } catch (err: unknown) {
      const apiErr = err as { code?: string }
      if (apiErr.code === 'PLAN_HAS_SUBSCRIPTIONS') {
        setError('No puedes eliminar un plan con suscripciones asociadas. Reasígnalas a otro plan primero.')
      } else {
        setError(getErrorMessage(err, 'No se pudo eliminar el plan. Inténtalo de nuevo.'))
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Eliminar plan"
      description={`¿Eliminar el plan "${planName}"? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      pendingLabel="Eliminando..."
      isPending={deleteMutation.isPending}
      destructive
      error={error}
      onConfirm={handleDelete}
    />
  )
}
