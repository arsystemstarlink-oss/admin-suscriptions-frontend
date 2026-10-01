import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUIStore } from '@/stores/ui.store'
import { useRegisterPayment, useBillingPeriods } from '@/hooks/useBilling'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
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
import { getClientFullName, hasOlderUnpaidPeriod } from '@/lib/utils'
import { useDolarRates } from '@/hooks/useExchange'
import { useExchangeStore } from '@/stores/exchange.store'
import { getRateForSource } from '@/lib/exchange'
import { BsReference } from '@/components/exchange/BsReference'
import { PaymentMethod } from '@/types/api'
import { CheckCircle, DollarSign, Calendar, CreditCard, AlignLeft, AlertTriangle } from 'lucide-react'

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
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)
  const { data: subscriptionPeriods } = useBillingPeriods(
    { subscriptionId: period?.subscriptionId },
    { enabled: !!period?.subscriptionId }
  )

  const blocked = period && subscriptionPeriods
    ? hasOlderUnpaidPeriod(period, subscriptionPeriods.periods)
    : false

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
    <Sheet open={quickPayOpen} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent className="sm:max-w-md">
        {!showSuccess ? (
          <>
            <SheetHeader>
              <SheetTitle>Registrar Pago</SheetTitle>
              <SheetDescription>Confirma los datos para procesar el pago</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form id="quick-pay-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {blocked && (
                  <div className="flex items-start gap-3 rounded-xl bg-warning/10 border border-warning/20 p-3 text-warning">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">
                      Existen períodos anteriores pendientes o vencidos. Debes cobrarlos primero antes de registrar este pago.
                    </p>
                  </div>
                )}

                {/* Resumen del Período */}
                <div className="p-4 bg-surface-muted rounded-xl border border-border-subtle space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground truncate pr-2">{getClientFullName(period.client)}</p>
                      {period.client?.dni && (
                        <p className="text-xs text-muted-foreground font-medium">C.I. {period.client.dni}</p>
                      )}
                    </div>
                    <Badge className={`shrink-0 ${BILLING_PERIOD_STATUS_COLORS[period.status]}`}>
                      {BILLING_PERIOD_STATUS_LABELS[period.status]}
                    </Badge>
                  </div>

                  <div className="flex flex-col gap-1 text-sm text-muted-foreground">
                    <div className="flex justify-between items-center">
                      <span>{period.subscription?.kitNumber ?? '—'} - {period.plan?.name ?? '—'}</span>
                      <span className="text-right">
                        <span className="font-bold text-base text-foreground">{formatCurrency(period.amount)}</span>
                        <BsReference usdAmount={period.amount} rate={activeRate} className="block" />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>{period.periodLabel}</span>
                      <span>Venció: <span className="font-medium text-destructive">{formatDate(period.endDate)}</span></span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    {period.subscription && (
                      <Badge className={SUBSCRIPTION_STATUS_COLORS[period.subscription.status]}>
                        {SUBSCRIPTION_STATUS_LABELS[period.subscription.status]}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator className="bg-border" />

                {/* Formulario Mobile-First */}
                <div className="space-y-4">

                  {/* Fecha */}
                  <div className="space-y-1.5">
                    <Label className="text-foreground">Fecha de Pago *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        type="date"
                        {...register('paidAt')}
                        min={minPaidAt}
                        className="pl-9 h-12"
                      />
                    </div>
                    {errors.paidAt && (
                      <p className="text-sm text-destructive font-medium">{errors.paidAt.message}</p>
                    )}
                  </div>

                  {/* Método */}
                  <div className="space-y-1.5">
                    <Label className="text-foreground">Método de Pago *</Label>
                    <Select onValueChange={(value) => setValue('paymentMethod', value)}>
                      <SelectTrigger className="h-12">
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Seleccione método" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(PAYMENT_METHOD_LABELS)
                          .filter(([key]) => key !== PaymentMethod.INITIAL_PAYMENT)
                          .map(([key, label]) => (
                            <SelectItem key={key} value={key} className="py-3">
                              {label}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {errors.paymentMethod && (
                      <p className="text-sm text-destructive font-medium">{errors.paymentMethod.message}</p>
                    )}
                  </div>

                  {/* Notas */}
                  <div className="space-y-1.5">
                    <Label className="text-foreground">Notas (opcional)</Label>
                    <div className="relative">
                      <AlignLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        placeholder="Referencia, observación..."
                        {...register('notes')}
                        className="pl-9 h-12"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <SheetFooter className="border-t border-border pt-4">
              <Button
                type="submit"
                form="quick-pay-form"
                className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md active:scale-95 transition-transform touch-manipulation"
                disabled={isSubmitting || blocked}
              >
                {isSubmitting ? (
                  'Procesando...'
                ) : (
                  <>
                    <DollarSign className="h-5 w-5 mr-2 shrink-0" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>Cobrar {formatCurrency(period.amount)}</span>
                      <BsReference usdAmount={period.amount} rate={activeRate} className="text-xs text-primary-foreground/80" />
                    </span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-12 mt-2 text-muted-foreground"
                onClick={handleClose}
              >
                Cancelar
              </Button>
            </SheetFooter>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-6">
            <div className="py-10 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-success/10 text-success flex items-center justify-center">
                <CheckCircle className="h-10 w-10 shrink-0" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Pago Registrado</h3>
                <p className="text-muted-foreground mt-2 font-medium">
                  {formatCurrency(period.amount)} — {period.periodLabel}
                </p>
                <BsReference usdAmount={period.amount} rate={activeRate} className="mt-1 block text-center" />
              </div>
              {reactivated && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-success/10 text-success border border-success/20 p-4 mt-4 mx-auto max-w-sm">
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <p className="text-sm font-semibold">
                    Suscripción reactivada automáticamente
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
