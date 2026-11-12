import { Link } from 'react-router-dom'
import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'

interface FormActionBarProps {
  formId: string
  cancelTo: string
  cancelState?: unknown
  submitLabel: string
  submittingLabel: string
  isSubmitting: boolean
}

export function FormActionBar({
  formId,
  cancelTo,
  cancelState,
  submitLabel,
  submittingLabel,
  isSubmitting,
}: FormActionBarProps) {
  const isOnline = useOnlineStatus()

  return (
    <div className="fixed bottom-(--mobile-nav-h) left-0 right-0 z-50 border-t border-border bg-surface/95 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:bottom-0">
      {!isOnline && (
        <p role="status" className="mb-3 flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <CloudOff className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          Sin conexión: no podrás guardar hasta recuperar la red.
        </p>
      )}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="outline"
          asChild
          className="h-12 flex-1 text-base font-semibold"
        >
          <Link
            to={cancelTo}
            state={cancelState}
            aria-disabled={isSubmitting}
            tabIndex={isSubmitting ? -1 : undefined}
            onClick={(event) => {
              if (isSubmitting) event.preventDefault()
            }}
          >
            Cancelar
          </Link>
        </Button>
        <Button
          type="submit"
          form={formId}
          className="h-12 flex-1 text-base font-semibold"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </div>
  )
}
