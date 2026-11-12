import { useEffect, useState } from 'react'
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog'
import { setHasUnsavedChanges } from '@/lib/pwa-update'

interface DiscardChangesGuardOptions {
  open: boolean
  isDirty: boolean
  isSubmitting?: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Equivalente de UnsavedChangesGuard para formularios dentro de un Sheet: un toque fuera,
 * el gesto atrás o "Cancelar" piden confirmación si hay cambios sin guardar.
 * Tras guardar, se cierra llamando al onOpenChange original, no al protegido.
 */
export function useDiscardChangesGuard({
  open,
  isDirty,
  isSubmitting = false,
  onOpenChange,
}: DiscardChangesGuardOptions) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const hasChanges = open && isDirty && !isSubmitting

  useEffect(() => {
    if (!hasChanges) return
    setHasUnsavedChanges(true)
    return () => setHasUnsavedChanges(false)
  }, [hasChanges])

  const guardedOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isSubmitting) return
    if (!nextOpen && isDirty) {
      setConfirmOpen(true)
      return
    }
    onOpenChange(nextOpen)
  }

  const discardDialog = (
    <ConfirmDialog
      open={confirmOpen}
      onOpenChange={setConfirmOpen}
      title="¿Salir sin guardar?"
      description="Tienes cambios sin guardar. Si sales ahora, los perderás."
      confirmLabel="Descartar cambios"
      cancelLabel="Seguir editando"
      destructive
      onConfirm={() => {
        setConfirmOpen(false)
        onOpenChange(false)
      }}
    />
  )

  return { guardedOpenChange, requestClose: () => guardedOpenChange(false), discardDialog }
}
