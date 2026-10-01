import { useState } from 'react'
import { useDeletePlan } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface DeletePlanSheetProps {
  planId: string
  planName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeletePlanSheet({ planId, planName, open, onOpenChange }: DeletePlanSheetProps) {
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-3 pr-8">
            <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            </div>
            <div>
              <SheetTitle>Eliminar Plan</SheetTitle>
              <SheetDescription>
                ¿Está seguro que desea eliminar el plan "{planName}"?
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 pt-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
              {error}
            </div>
          )}
        </div>

        <SheetFooter className="flex-row justify-end gap-2">
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
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
