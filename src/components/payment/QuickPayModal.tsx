import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useUIStore } from '@/stores/ui.store'
import { useRegisterPayment, useBillingPeriods } from '@/hooks/useBilling'
import { useOrganizationStore } from '@/stores/organization.store'
import { getLastPaymentMethod, saveLastPaymentMethod } from '@/lib/payment-method-preference'
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
  PAYMENT_METHOD_OPTIONS,
  BILLING_PERIOD_STATUS_COLORS,
  BILLING_PERIOD_STATUS_LABELS,
} from '@/lib/constants'
import { getClientFullName, getLocalDateInputValue, hasOlderUnpaidPeriod } from '@/lib/utils'
import { useDolarRates } from '@/hooks/useExchange'
import { useExchangeStore } from '@/stores/exchange.store'
import { getRateForSource } from '@/lib/exchange'
import { BsReference } from '@/components/exchange/BsReference'
import { BillingPeriodStatus, PaymentMethod, type BillingPeriodWithDetails } from '@/types/api'
import { CheckCircle, DollarSign, Calendar, CreditCard, AlignLeft, AlertTriangle, LoaderCircle, MessageSquare } from 'lucide-react'

const createPaymentSchema = (minDate: string) =>
  z.object({
    paymentMethod: z.string().min(1, 'Selecciona un método de pago'),
    paidAt: z
      .string()
      .min(1, 'Fecha de pago requerida')
      .refine((date) => !minDate || date >= minDate, {
        message: minDate ? `La fecha no puede ser anterior a ${formatDate(minDate)}` : 'Fecha inválida',
      })
      .refine((date) => date <= getLocalDateInputValue(), {
        message: 'La fecha de pago no puede ser futura',
      }),
    notes: z.string().optional(),
  })

type PaymentForm = z.infer<ReturnType<typeof createPaymentSchema>>

export function QuickPayModal() {
  const { quickPayOpen, quickPayContext, openQuickPay, closeQuickPay } = useUIStore()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const [showSuccess, setShowSuccess] = useState(false)
  const [reactivated, setReactivated] = useState(false)

  const period = quickPayContext?.period
  const registerPayment = useRegisterPayment(period?.id || '')
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)
  const { data: subscriptionPeriods } = useBillingPeriods(
    { subscriptionId: period?.subscriptionId, organizationId: organizationId ?? undefined, limit: 200 },
    { enabled: !!period?.subscriptionId }
  )

  const blocked = period && subscriptionPeriods
    ? hasOlderUnpaidPeriod(period, subscriptionPeriods.periods)
    : false

  // Sin pagar y distinto del actual, del más antiguo al más reciente: es el orden de cobro.
  const otherUnpaidPeriods = (subscriptionPeriods?.periods ?? [])
    .filter((p) => p.id !== period?.id && (p.status === 'PENDING' || p.status === 'OVERDUE'))
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const oldestOtherUnpaidPeriod = otherUnpaidPeriods[0]

  // Validar que la fecha de pago no sea anterior al inicio del período
  const minPaidAt = period?.startDate ? period.startDate.split('T')[0] : ''

  const {
    handleSubmit,
    setValue,
    watch,
    register,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PaymentForm>({
    resolver: zodResolver(createPaymentSchema(minPaidAt)),
    defaultValues: {
      paidAt: getLocalDateInputValue(),
      paymentMethod: '',
    },
  })

  // La PWA puede quedar abierta varios días: la fecha se calcula al abrir, no al montar.
  useEffect(() => {
    if (quickPayOpen) reset({ paidAt: getLocalDateInputValue(), paymentMethod: getLastPaymentMethod(), notes: '' })
  }, [quickPayOpen, period?.id, reset])

  const handleClose = () => {
    closeQuickPay()
    setShowSuccess(false)
    setReactivated(false)
  }

  const openOtherPeriod = (target: BillingPeriodWithDetails) => {
    setShowSuccess(false)
    setReactivated(false)
    openQuickPay({
      period: {
        ...target,
        subscription: target.subscription ?? period!.subscription,
        client: target.client ?? period!.client,
        plan: target.plan ?? period!.plan,
      },
    })
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

      saveLastPaymentMethod(data.paymentMethod)
      setReactivated(response.subscription.reactivated)
      setShowSuccess(true)
    } catch {
      // Error handled in useRegisterPayment
    }
  }

  if (!period) return null

  const isPastDue =
    period.status === BillingPeriodStatus.OVERDUE || new Date(period.endDate).getTime() < Date.now()

  // wa.me abre el mensaje para revisarlo y enviarlo: la API solo admite texto libre
  // dentro de la ventana de 24 h y no hay plantilla de confirmación de pago.
  const clientPhone = period.client?.phone?.replace(/\D/g, '')
  const paymentConfirmationUrl = clientPhone
    ? `https://wa.me/${clientPhone}?text=${encodeURIComponent(
        `Hola ${getClientFullName(period.client)}, recibimos tu pago de ${formatCurrency(period.amount)} correspondiente a ${period.periodLabel}. ¡Gracias!`,
      )}`
    : null

  return (
    <Sheet open={quickPayOpen} onOpenChange={(open) => !open && !isSubmitting && handleClose()}>
      <SheetContent className="sm:max-w-md">
        {!showSuccess ? (
          <>
            <SheetHeader>
              <SheetTitle>Revisar cobro</SheetTitle>
              <SheetDescription>Verifica el período y el monto antes de registrar el pago</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form id="quick-pay-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                {blocked && (
                  <div className="space-y-3 rounded-xl bg-warning/10 border border-warning/20 p-3 text-warning">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <p className="text-sm font-medium">
                        Existen períodos anteriores pendientes o vencidos. Debes cobrarlos primero antes de registrar este pago.
                      </p>
                    </div>
                    {oldestOtherUnpaidPeriod && (
                      <Button type="button" variant="outline" className="w-full" onClick={() => openOtherPeriod(oldestOtherUnpaidPeriod)}>
                        Cobrar primero {oldestOtherUnpaidPeriod.periodLabel}
                      </Button>
                    )}
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
                      <span>
                        {isPastDue ? 'Venció' : 'Vence'}:{' '}
                        <span className={isPastDue ? 'font-medium text-destructive' : 'font-medium text-foreground'}>
                          {formatDate(period.endDate)}
                        </span>
                      </span>
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
                    <Label htmlFor="quick-pay-date" className="text-foreground">Fecha de pago *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        id="quick-pay-date"
                        type="date"
                        {...register('paidAt')}
                        min={minPaidAt}
                        max={getLocalDateInputValue()}
                        aria-invalid={!!errors.paidAt}
                        className="pl-9 h-12"
                      />
                    </div>
                    {errors.paidAt && (
                      <p className="text-sm text-destructive font-medium">{errors.paidAt.message}</p>
                    )}
                  </div>

                  {/* Método */}
                  <div className="space-y-1.5">
                    <Label htmlFor="quick-pay-method" className="text-foreground">Método de pago *</Label>
                    <Select value={watch('paymentMethod')} onValueChange={(value) => setValue('paymentMethod', value, { shouldValidate: true })}>
                      <SelectTrigger id="quick-pay-method" className="h-12" aria-invalid={!!errors.paymentMethod}>
                        <div className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4 text-muted-foreground" />
                          <SelectValue placeholder="Selecciona método" />
                        </div>
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHOD_OPTIONS
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
                    <Label htmlFor="quick-pay-notes" className="text-foreground">Notas (opcional)</Label>
                    <div className="relative">
                      <AlignLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        id="quick-pay-notes"
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
                className="w-full h-14 text-base font-semibold"
                disabled={isSubmitting || blocked}
              >
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="h-5 w-5 mr-2 shrink-0 animate-spin" />
                    Registrando...
                  </>
                ) : (
                  <>
                    <DollarSign className="h-5 w-5 mr-2 shrink-0" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>Cobrar {formatCurrency(period.amount)}</span>
                      <BsReference usdAmount={period.amount} rate={activeRate} className="text-xs opacity-80" />
                    </span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full h-12 mt-2 text-muted-foreground"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
            </SheetFooter>
          </>
        ) : (
          <>
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-6" role="status">
            <div className="py-6 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-success/10 text-success flex items-center justify-center">
                <CheckCircle className="h-10 w-10 shrink-0" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">Pago registrado</h3>
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
          <SheetFooter className="border-t border-border pt-4">
            {oldestOtherUnpaidPeriod && (
              <Button type="button" className="h-12 w-full font-semibold" onClick={() => openOtherPeriod(oldestOtherUnpaidPeriod)}>
                <DollarSign className="h-5 w-5 mr-1 shrink-0" />
                Cobrar siguiente: {oldestOtherUnpaidPeriod.periodLabel}
              </Button>
            )}
            {paymentConfirmationUrl && (
              <Button asChild variant="outline" className="h-12 w-full">
                <a href={paymentConfirmationUrl} target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="h-4 w-4 mr-2 shrink-0" />
                  Enviar confirmación por WhatsApp
                </a>
              </Button>
            )}
            <Button type="button" variant="ghost" className="h-12 w-full" onClick={handleClose}>
              Listo
            </Button>
          </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
