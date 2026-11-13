import { useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { setHasUnsavedChanges } from '@/lib/pwa-update'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface UnsavedChangesGuardProps {
  isDirty: boolean
  isSubmitting: boolean
}

export function UnsavedChangesGuard({ isDirty, isSubmitting }: UnsavedChangesGuardProps) {
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty &&
      !isSubmitting &&
      (currentLocation.pathname !== nextLocation.pathname ||
        currentLocation.search !== nextLocation.search ||
        currentLocation.hash !== nextLocation.hash),
  )

  useEffect(() => {
    setHasUnsavedChanges(isDirty && !isSubmitting)
    return () => setHasUnsavedChanges(false)
  }, [isDirty, isSubmitting])

  useEffect(() => {
    if (!isDirty || isSubmitting) return

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty, isSubmitting])

  return (
    <Dialog
      open={blocker.state === 'blocked'}
      onOpenChange={(open) => {
        if (!open && blocker.state === 'blocked') blocker.reset()
      }}
    >
      <DialogContent className="bg-surface-elevated text-surface-elevated-foreground">
        <DialogHeader>
          <DialogTitle>¿Salir sin guardar?</DialogTitle>
          <DialogDescription>
            Tienes cambios sin guardar. Si sales ahora, los perderás.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => blocker.state === 'blocked' && blocker.reset()}
          >
            Seguir editando
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => blocker.state === 'blocked' && blocker.proceed()}
          >
            Descartar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
