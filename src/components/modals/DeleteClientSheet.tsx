import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDeleteClient } from '@/hooks/useClients'
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-handler'

interface DeleteClientSheetProps {
  clientId: string
  clientName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteClientSheet({ clientId, clientName, open, onOpenChange }: DeleteClientSheetProps) {
  const navigate = useNavigate()
  const deleteMutation = useDeleteClient()
  const [error, setError] = useState<string | null>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) setError(null)
    onOpenChange(nextOpen)
  }

  const handleDelete = async () => {
    setError(null)

    try {
      await deleteMutation.mutateAsync(clientId)
      toast.success('Cliente eliminado correctamente')
      onOpenChange(false)
      navigate('/subscriptions/clients')
    } catch (err: unknown) {
      const apiErr = err as { code?: string }
      if (apiErr.code === 'CLIENT_HAS_ACTIVE_SUBSCRIPTIONS') {
        setError('No puedes eliminar un cliente con suscripciones activas. Elimínalas primero.')
      } else if (apiErr.code === 'CLIENT_HAS_SUBSCRIPTIONS') {
        setError('No puedes eliminar un cliente con suscripciones suspendidas. Elimínalas primero.')
      } else {
        setError(getErrorMessage(err, 'No se pudo eliminar el cliente. Inténtalo de nuevo.'))
      }
    }
  }

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={handleOpenChange}
      title="Eliminar cliente"
      description={`¿Eliminar a ${clientName}? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      pendingLabel="Eliminando..."
      isPending={deleteMutation.isPending}
      destructive
      error={error}
      onConfirm={handleDelete}
    />
  )
}
