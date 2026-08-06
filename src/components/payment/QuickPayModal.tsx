import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUIStore } from '@/stores/ui.store'
import { useRegisterPayment } from '@/hooks/useBilling'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  formatCurrency,
  formatDate,
  SUBSCRIPTION_STATUS_COLORS,
  SUBSCRIPTION_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  BILLING_PERIOD_STATUS_COLORS,
  BILLING_PERIOD_STATUS_LABELS,
} from '@/lib/constants'
import { PaymentMethod } from '@/types/api'
import { CheckCircle, DollarSign } from 'lucide-react'

const createPaymentSchema = (minDate: string) =>
  z.object({
    paymentMethod: z.string().min(1, 'Seleccione un método de pago'),
    paidAt: z
      .string()
      .min(1, 'Fecha de pago requerida')
      .refine((date) => !minDate || date >= minDate, {
        message: minDate ? `La fecha no puede ser anterior a ${formatDate(minDate)}` : 'Fecha inválida',
      }),
    notes: z.string().optional(),
  })

type PaymentForm = z.infer<ReturnType<typeof createPaymentSchema>>

const getDefaultPaidAt = () => {
  return new Date().toISOString().split('T')[0]
}

export function QuickPayModal() {
  const { quickPayOpen, quickPayContext, closeQuickPay } = useUIStore()
  const [showSuccess, setShowSuccess] = useState(false)
  const [reactivated, setReactivated] = useState(false)

  const period = quickPayContext?.period
  const registerPayment = useRegisterPayment(period?.id || '')

  // Validar que la fecha de pago no sea anterior al inicio del período
  const minPaidAt = period?.startDate ? period.startDate.split('T')[0] : ''

  const {
    handleSubmit,
    setValue,
    register,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PaymentForm>({
    resolver: zodResolver(createPaymentSchema(minPaidAt)),
    defaultValues: {
      paidAt: getDefaultPaidAt(),
    },
  })

  const handleClose = () => {
    closeQuickPay()
    setShowSuccess(false)
    setReactivated(false)
    reset()
  }

  const onSubmit = async (data: PaymentForm) => {
    if (!period) return

    try {
      const response = await registerPayment.mutateAsync({
        paymentMethod: data.paymentMethod as PaymentMethod,
        amount: period.amount,
        paidAt: data.paidAt,
        notes: data.notes || undefined,
      })

      setReactivated(response.subscription.reactivated)
      setShowSuccess(true)
      setTimeout(handleClose, 2500)
    } catch {
      // Error handled in useRegisterPayment
    }
  }

  if (!period) return null

  return (
    <Dialog open={quickPayOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        {!showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>Confirme los datos del pago</DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="p-3 bg-muted rounded-lg border space-y-2">
                <div className="flex items-center justify-between">
                  <p className="font-medium text-foreground">{period.client.name}</p>
                  <Badge className={BILLING_PERIOD_STATUS_COLORS[period.status]}>
                    {BILLING_PERIOD_STATUS_LABELS[period.status]}
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
                <div className="text-sm text-muted-foreground">
                  Venció: {formatDate(period.endDate)}
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={SUBSCRIPTION_STATUS_COLORS[period.subscription.status]}>
                    {SUBSCRIPTION_STATUS_LABELS[period.subscription.status]}
                  </Badge>
                </div>
              </div>

              <Separator />

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label>Monto</Label>
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm font-semibold text-foreground">
                    {formatCurrency(period.amount)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Fecha de Pago *</Label>
                  <Input
                    type="date"
                    {...register('paidAt')}
                    min={minPaidAt}
                  />
                  {errors.paidAt && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.paidAt.message}</p>
                  )}
                  {minPaidAt && (
                    <p className="text-xs text-muted-foreground">
                      Fecha mínima: {formatDate(minPaidAt)}
                    </p>
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

                <div className="flex items-center gap-3 pt-2">
                  <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="flex-1 gap-2" disabled={isSubmitting}>
                    {isSubmitting ? (
                      'Procesando...'
                    ) : (
                      <>
                        <DollarSign className="h-4 w-4 shrink-0" />
                        Cobrar
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </>
        ) : (
          <div className="py-8 text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary-800/10 text-primary-900 dark:bg-primary-200/10 dark:text-primary-50 flex items-center justify-center">
              <CheckCircle className="h-8 w-8 shrink-0" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Pago Registrado</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {formatCurrency(period.amount)} — {period.periodLabel}
              </p>
            </div>
            {reactivated && (
              <div className="flex items-center justify-center gap-2 rounded-lg border border-primary-100 bg-white text-primary-900 dark:border-primary-800 dark:bg-primary-900/50 dark:text-primary-50 p-3">
                <CheckCircle className="h-4 w-4 shrink-0 text-primary-800 dark:text-primary-100" />
                <p className="text-sm font-medium">
                  Suscripción reactivada automáticamente
                </p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">Cerrando automáticamente...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
