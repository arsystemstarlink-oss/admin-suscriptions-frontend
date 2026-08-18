import { useState, useEffect } from 'react'
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from '@/components/ui/drawer'
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const period = quickPayContext?.period
  const registerPayment = useRegisterPayment(period?.id || '')
  const { data: subscriptionPeriods } = useBillingPeriods(
    { subscriptionId: period?.subscriptionId },
    !!period?.subscriptionId
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

  const FormContent = () => (
    <form id="quick-pay-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5 px-4 md:px-0">
      
      {blocked && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800 dark:bg-amber-950/40 dark:border-amber-900/60 dark:text-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium">
            Existen períodos anteriores pendientes o vencidos. Debes cobrarlos primero antes de registrar este pago.
          </p>
        </div>
      )}

      {/* Resumen del Período */}
      <div className="p-4 bg-primary-50 dark:bg-primary-900/40 rounded-xl border border-primary-100 dark:border-primary-800/60 space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="font-semibold text-primary-900 dark:text-primary-50 truncate pr-2">{getClientFullName(period.client)}</p>
            {period.client?.dni && (
              <p className="text-xs text-primary-500 dark:text-primary-400 font-medium">C.I. {period.client.dni}</p>
            )}
          </div>
          <Badge className={`shrink-0 ${BILLING_PERIOD_STATUS_COLORS[period.status]}`}>
            {BILLING_PERIOD_STATUS_LABELS[period.status]}
          </Badge>
        </div>
        
        <div className="flex flex-col gap-1 text-sm text-primary-600 dark:text-primary-300">
          <div className="flex justify-between items-center">
            <span>Kit #{period.subscription.kitNumber} - {period.plan.name}</span>
            <span className="font-bold text-base text-primary-900 dark:text-primary-50">{formatCurrency(period.amount)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span>{period.periodLabel}</span>
            <span>Venció: <span className="font-medium text-red-600 dark:text-red-400">{formatDate(period.endDate)}</span></span>
          </div>
        </div>
        <div className="flex items-center gap-2 pt-1">
          <Badge className={SUBSCRIPTION_STATUS_COLORS[period.subscription.status]}>
            {SUBSCRIPTION_STATUS_LABELS[period.subscription.status]}
          </Badge>
        </div>
      </div>

      <Separator className="bg-primary-100 dark:bg-primary-800" />

      {/* Formulario Mobile-First */}
      <div className="space-y-4">
        
        {/* Fecha */}
        <div className="space-y-1.5">
          <Label className="text-primary-800 dark:text-primary-200">Fecha de Pago *</Label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400 shrink-0" />
            <Input
              type="date"
              {...register('paidAt')}
              min={minPaidAt}
              className="pl-9 h-12 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700"
            />
          </div>
          {errors.paidAt && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.paidAt.message}</p>
          )}
        </div>

        {/* Método */}
        <div className="space-y-1.5">
          <Label className="text-primary-800 dark:text-primary-200">Método de Pago *</Label>
          <Select onValueChange={(value) => setValue('paymentMethod', value)}>
            <SelectTrigger className="h-12 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary-400" />
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
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.paymentMethod.message}</p>
          )}
        </div>

        {/* Notas */}
        <div className="space-y-1.5">
          <Label className="text-primary-800 dark:text-primary-200">Notas (opcional)</Label>
          <div className="relative">
            <AlignLeft className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400 shrink-0" />
            <Input
              placeholder="Referencia, observación..."
              {...register('notes')}
              className="pl-9 h-12 bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700"
            />
          </div>
        </div>
      </div>
    </form>
  )

  const SuccessState = () => (
    <div className="py-10 text-center space-y-4 px-4">
      <div className="mx-auto h-20 w-20 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400 flex items-center justify-center">
        <CheckCircle className="h-10 w-10 shrink-0" />
      </div>
      <div>
        <h3 className="text-xl font-bold text-primary-900 dark:text-primary-50">Pago Registrado</h3>
        <p className="text-primary-600 dark:text-primary-300 mt-2 font-medium">
          {formatCurrency(period.amount)} — {period.periodLabel}
        </p>
      </div>
      {reactivated && (
        <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300 p-4 mt-4 mx-auto max-w-sm">
          <CheckCircle className="h-5 w-5 shrink-0" />
          <p className="text-sm font-semibold">
            Suscripción reactivada automáticamente
          </p>
        </div>
      )}
    </div>
  )

  // MOBILE: Drawer (Bottom Sheet)
  if (isMobile) {
    return (
      <Drawer open={quickPayOpen} onOpenChange={(open) => !open && handleClose()}>
        <DrawerContent>
          {!showSuccess ? (
            <>
              <DrawerHeader className="text-left px-4">
                <DrawerTitle>Registrar Pago</DrawerTitle>
                <DrawerDescription>Confirma los datos para procesar el pago</DrawerDescription>
              </DrawerHeader>
              
              <div className="overflow-y-auto overflow-x-hidden max-h-[60vh] pb-4">
                <FormContent />
              </div>
              
              <DrawerFooter className="border-t border-primary-100 dark:border-primary-800 mt-0 pt-4">
                <Button 
                  type="submit" 
                  form="quick-pay-form" 
                  className="w-full h-14 text-base font-semibold bg-primary-800 hover:bg-primary-900 text-white dark:bg-primary-700 dark:hover:bg-primary-600 shadow-md active:scale-95 transition-transform touch-manipulation" 
                  disabled={isSubmitting || blocked}
                >
                  {isSubmitting ? (
                    'Procesando...'
                  ) : (
                    <>
                      <DollarSign className="h-5 w-5 mr-2 shrink-0" />
                      Cobrar {formatCurrency(period.amount)}
                    </>
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="ghost" 
                  className="w-full h-12 mt-2 text-primary-600 dark:text-primary-400" 
                  onClick={handleClose}
                >
                  Cancelar
                </Button>
              </DrawerFooter>
            </>
          ) : (
            <SuccessState />
          )}
        </DrawerContent>
      </Drawer>
    )
  }

  // DESKTOP: Dialog (Modal)
  return (
    <Dialog open={quickPayOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        {!showSuccess ? (
          <>
            <DialogHeader>
              <DialogTitle>Registrar Pago</DialogTitle>
              <DialogDescription>Confirme los datos del pago</DialogDescription>
            </DialogHeader>

            <FormContent />

            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
              <Button type="button" variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button type="submit" form="quick-pay-form" className="gap-2" disabled={isSubmitting || blocked}>
                {isSubmitting ? (
                  'Procesando...'
                ) : (
                  <>
                    <DollarSign className="h-4 w-4 shrink-0" />
                    Cobrar {formatCurrency(period.amount)}
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <SuccessState />
        )}
      </DialogContent>
    </Dialog>
  )
}
