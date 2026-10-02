import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePayAdvance } from '@/hooks/useSubscriptions'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
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
  PAYMENT_METHOD_LABELS,
} from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import { useDolarRates } from '@/hooks/useExchange'
import { useExchangeStore } from '@/stores/exchange.store'
import { getRateForSource } from '@/lib/exchange'
import { BsReference } from '@/components/exchange/BsReference'
import { PaymentMethod, type SubscriptionWithDetails } from '@/types/api'
import { CheckCircle, DollarSign, Calendar, CreditCard, AlignLeft, CalendarClock } from 'lucide-react'

const advanceSchema = z.object({
  paymentMethod: z.string().min(1, 'Seleccione un método de pago'),
  paidAt: z.string().min(1, 'Fecha de pago requerida'),
  notes: z.string().optional(),
})

type AdvanceForm = z.infer<typeof advanceSchema>

const getDefaultPaidAt = () => {
  return new Date().toISOString().split('T')[0]
}

function addOneMonthUtc(dateStr: string): string {
  const d = new Date(dateStr)
  const next = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()))
  return next.toISOString().split('T')[0]
}

interface PayAdvanceSheetProps {
  subscription: SubscriptionWithDetails | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PayAdvanceSheet({ subscription, open, onOpenChange }: PayAdvanceSheetProps) {
  const [showSuccess, setShowSuccess] = useState(false)
  const payAdvance = usePayAdvance(subscription?.id || '')
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)

  const anchor = subscription?.currentPeriod
  const nextStart = anchor ? anchor.endDate.split('T')[0] : ''
  const nextEnd = anchor ? addOneMonthUtc(anchor.endDate) : ''
  const amount = subscription?.plan.price ?? 0

  const {
    handleSubmit,
    setValue,
    register,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<AdvanceForm>({
    resolver: zodResolver(advanceSchema),
    defaultValues: {
      paidAt: getDefaultPaidAt(),
    },
  })

  const handleClose = () => {
    onOpenChange(false)
    setShowSuccess(false)
    reset()
  }

  const onSubmit = async (data: AdvanceForm) => {
    if (!subscription) return

    try {
      await payAdvance.mutateAsync({
        paymentMethod: data.paymentMethod as PaymentMethod,
        paidAt: data.paidAt,
        notes: data.notes || undefined,
      })
      setShowSuccess(true)
      setTimeout(handleClose, 2500)
    } catch {
      // Error handled in usePayAdvance
    }
  }

  if (!subscription || !anchor) return null

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent className="sm:max-w-md">
        {!showSuccess ? (
          <>
            <SheetHeader>
              <SheetTitle>Pagar por adelantado</SheetTitle>
              <SheetDescription>Genera y paga el siguiente ciclo de una vez</SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto p-6 pt-4">
              <form id="pay-advance-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">

                <div className="p-4 bg-surface-muted rounded-xl border border-border-subtle space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="font-semibold text-foreground truncate">{getClientFullName(subscription.client)}</p>
                  </div>

                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>{anchor.periodLabel} → siguiente ciclo</span>
                    <span className="text-right">
                      <span className="font-bold text-base text-foreground">{formatCurrency(amount)}</span>
                      <BsReference usdAmount={amount} rate={activeRate} className="block" />
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm text-muted-foreground">
                    <span>Siguiente ciclo</span>
                    <span className="font-medium text-foreground">{formatDate(nextStart)} — {formatDate(nextEnd)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Monto según plan vigente ({subscription.plan.name}).</p>
                </div>

                <Separator className="bg-border" />

                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground">Fecha de Pago *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                      <Input
                        type="date"
                        {...register('paidAt')}
                        max={getDefaultPaidAt()}
                        className="pl-9 h-12"
                      />
                    </div>
                    {errors.paidAt && (
                      <p className="text-sm text-destructive font-medium">{errors.paidAt.message}</p>
                    )}
                  </div>

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
                form="pay-advance-form"
                className="w-full h-14 text-base font-semibold"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  'Procesando...'
                ) : (
                  <>
                    <DollarSign className="h-5 w-5 mr-2 shrink-0" />
                    <span className="flex flex-col items-start leading-tight">
                      <span>Adelantar {formatCurrency(amount)}</span>
                      <BsReference usdAmount={amount} rate={activeRate} className="text-xs opacity-80" />
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
                <h3 className="text-xl font-bold text-foreground">Adelanto registrado</h3>
                <p className="text-muted-foreground mt-2 font-medium">
                  {formatCurrency(amount)} — {formatDate(nextStart)} al {formatDate(nextEnd)}
                </p>
                <BsReference usdAmount={amount} rate={activeRate} className="mt-1 block text-center" />
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
