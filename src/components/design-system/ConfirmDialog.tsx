import { type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { useIsMobile } from '@/hooks/useIsMobile'
import { cn } from '@/lib/utils'

interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  pendingLabel?: string
  cancelLabel?: string
  isPending?: boolean
  destructive?: boolean
  /** Deshabilita la confirmación mientras falte un dato (p. ej. la contraseña). */
  confirmDisabled?: boolean
  /** Error de la acción, mostrado dentro del diálogo en vez de cerrarlo. */
  error?: string | null
  /** Contenido extra entre la descripción y los botones. */
  children?: ReactNode
  onConfirm: () => void
}

/**
 * Confirmación única de la app: hoja inferior en móvil, diálogo centrado en desktop.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  pendingLabel = 'Procesando...',
  cancelLabel = 'Cancelar',
  isPending = false,
  destructive = false,
  confirmDisabled = false,
  error,
  children,
  onConfirm,
}: ConfirmDialogProps) {
  const isMobile = useIsMobile()

  const handleOpenChange = (nextOpen: boolean) => {
    if (!isPending) onOpenChange(nextOpen)
  }

  const icon = (
    <AlertTriangle
      className={cn('h-5 w-5 shrink-0', destructive ? 'text-destructive' : 'text-warning')}
      aria-hidden="true"
    />
  )

  const body = (error || children) && (
    <div className="space-y-3">
      {children}
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
        >
          {error}
        </p>
      )}
    </div>
  )

  const actions = (
    <>
      <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
        {cancelLabel}
      </Button>
      <Button
        type="button"
        variant={destructive ? 'destructive' : 'default'}
        onClick={onConfirm}
        disabled={isPending || confirmDisabled}
      >
        {isPending ? pendingLabel : confirmLabel}
      </Button>
    </>
  )

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent>
          <SheetHeader className="border-b-0 pb-2">
            <SheetTitle className="flex items-center gap-2 pr-8 leading-snug">
              {icon}
              {title}
            </SheetTitle>
            <SheetDescription>{description}</SheetDescription>
          </SheetHeader>
          {body && <div className="overflow-y-auto px-6 pb-2">{body}</div>}
          <SheetFooter className="flex-col-reverse border-t-0 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
            {actions}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md bg-surface-elevated text-surface-elevated-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 pr-6 leading-snug">
            {icon}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {body}
        <DialogFooter className="gap-2 sm:gap-0">{actions}</DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
