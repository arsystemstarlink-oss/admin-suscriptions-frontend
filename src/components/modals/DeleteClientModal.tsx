import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteClient } from '@/hooks/useClients'
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

interface DeleteClientModalProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteClientModal({ clientId, clientName, open, onOpenChange }: DeleteClientModalProps) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteClient()
  const [error, setError] = useState<string | null>(null)

  const handleDelete = async () => {
    setError(null)

    try {
      await deleteMutation.mutateAsync(clientId)
      toast.success('Cliente eliminado correctamente')
      onOpenChange(false)
      navigate('/config/clients')
    } catch (err: any) {
      if (err.code === 'CLIENT_HAS_ACTIVE_SUBSCRIPTIONS') {
        setError('No puede eliminar un cliente con suscripciones activas. Suspéndalas o elimínelas primero.')
      } else {
        setError('Error al eliminar el cliente. Intente nuevamente.')
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
              <DialogTitle>Eliminar Cliente</DialogTitle>
              <DialogDescription>
                ¿Está seguro que desea eliminar a {clientName}?
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
