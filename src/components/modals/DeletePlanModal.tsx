import { useState } from 'react'
import { useDeletePlan } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface DeletePlanModalProps {
  planId: string
  planName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePlanModal({ planId, planName, open, onOpenChange }: DeletePlanModalProps) {
  const deleteMutation = useDeletePlan()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)

    try {
      await deleteMutation.mutateAsync(planId)
      toast.success('Plan eliminado correctamente')
      onOpenChange(false)
    } catch (err: unknown) {
      const apiErr = err as { code?: string }
      if (apiErr.code === 'PLAN_HAS_SUBSCRIPTIONS') {
        setError('No puede eliminar un plan con suscripciones asociadas. Reasígnelas a otro plan primero.')
      } else {
        setError('Error al eliminar el plan. Intente nuevamente.')
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-950 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            </div>
            <div>
              <DialogTitle>Eliminar Plan</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea eliminar el plan "{planName}"?
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
            {error}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
