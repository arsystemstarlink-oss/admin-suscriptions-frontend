import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUpdateBillingPeriod } from '@/hooks/useBilling'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { formatCurrency, formatDate, PAYMENT_METHOD_LABELS, BILLING_PERIOD_STATUS_COLORS } from '@/lib/constants'
import { PaymentMethod, type BillingPeriodWithDetails } from '@/types/api'
import { Edit, CheckCircle } from 'lucide-react'

const editPaymentSchema = z.object({
  paymentMethod: z.string().min(1, 'Seleccione un método de pago'),
  paidAt: z.string().min(1, 'Fecha de pago requerida'),
  amount: z.coerce.number().min(0.01, 'Monto requerido'),
  notes: z.string().optional(),
})

type EditPaymentForm = z.infer<typeof editPaymentSchema>

interface EditPaymentModalProps {
  period: BillingPeriodWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPaymentModal({ period, open, onOpenChange }: EditPaymentModalProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const updatePayment = useUpdateBillingPeriod()

  const {
    handleSubmit,
    setValue,
    register,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EditPaymentForm>({
    resolver: zodResolver(editPaymentSchema),
  })

  useEffect(() => {
    if (period && open) {
      reset({
        paymentMethod: period.paymentMethod || '',
        paidAt: period.paidAt || '',
        amount: period.amount,
        notes: period.notes || '',
      })
    }
  }, [period, open, reset])

  const handleClose = () => {
    onOpenChange(false)
    setShowSuccess(false)
    reset()
  }

  const onSubmit = async (data: EditPaymentForm) => {
    if (!period) return

    try {
      await updatePayment.mutateAsync({
        periodId: period.id,
        data: {
          paymentMethod: data.paymentMethod as PaymentMethod,
          paidAt: data.paidAt,
          amount: data.amount,
          notes: data.notes || undefined,
        },
      })

      setShowSuccess(true)
      setTimeout(handleClose, 1500)
    } catch {
      // Error handled in hook
    }
  }

  if (!period) return null

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        {!showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Editar Pago</DialogTitle>
              <DialogDescription>
                Modifique los datos del pago registrado
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{period.client.name}</p>
                  <Badge className={BILLING_PERIOD_STATUS_COLORS[period.status]}>
                    Pagado
                  </Badge>
                </div>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>Kit #{period.subscription.kitNumber}</span>
                  <span>{period.plan.name}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{period.periodLabel}</span>
                  <span className="font-semibold text-foreground">{formatCurrency(period.amount)}</span>
                </div>
                {period.paidAt && (
                  <div className="text-sm text-muted-foreground">
                    Pagado: {formatDate(period.paidAt)}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register('amount')}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.amount.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Pago *</Label>
                  <Input
                    type="date"
                    {...register('paidAt')}
                  />
                  {errors.paidAt && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.paidAt.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Método de Pago *</Label>
                  <Select onValueChange={(value) => setValue('paymentMethod', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione método" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PAYMENT_METHOD_LABELS)
                        .filter(([key]) => key !== PaymentMethod.INITIAL_PAYMENT)
                        .map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  {errors.paymentMethod && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.paymentMethod.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Notas (opcional)</Label>
                  <Input
                    placeholder="Referencia, observación..."
                    {...register('notes')}
                  />
                </div>

                <DialogFooter className="gap-2">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                  </Button>
                </DialogFooter>
              </form>
            </div>
          </>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary-800/10 text-primary-900 dark:bg-primary-200/10 dark:text-primary-50 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 shrink-0" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Pago Actualizado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Los datos del pago han sido modificados correctamente
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Cerrando automáticamente...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function EditPaymentButton({ period, onClick }: { period: BillingPeriodWithDetails; onClick: () => void }) {
  if (period.status !== 'PAID') return null

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="text-muted-foreground hover:text-foreground"
    >
      <Edit className="h-4 w-4 shrink-0" />
    </Button>
  )
}
