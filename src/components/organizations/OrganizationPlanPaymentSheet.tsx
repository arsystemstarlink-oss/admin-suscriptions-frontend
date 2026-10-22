import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  useRegisterOrganizationPlanPayment,
} from '@/hooks/useOrganizations'
import { BUSINESS_PLANS } from '@/lib/constants'
import { handleApiError } from '@/lib/error-handler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { BusinessPlanKey, Organization, OrganizationPlanPaymentMethod } from '@/types/api'

const paymentSchema = z.object({
  paidAt: z.string().min(1, 'Indica la fecha del pago'),
  amount: z.number().positive('El monto debe ser mayor que cero'),
  method: z.enum(['transferencia', 'usdt', 'efectivo']),
  plan: z.enum(['basico', 'pro', 'negocio', 'a-medida']),
  newPlanExpiresAt: z.string().min(1, 'Indica el nuevo vencimiento'),
})

type PaymentForm = z.infer<typeof paymentSchema>

interface OrganizationPlanPaymentSheetProps {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}

function endOfDayUtc(date: string): string {
  return new Date(`${date}T23:59:59.999Z`).toISOString()
}

export function OrganizationPlanPaymentSheet({
  organization,
  open,
  onOpenChange,
}: OrganizationPlanPaymentSheetProps) {
  const paymentMutation = useRegisterOrganizationPlanPayment()
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paidAt: new Date().toISOString().slice(0, 10),
      amount: 0,
      method: 'transferencia',
      plan: organization.plan ?? 'basico',
      newPlanExpiresAt: organization.planExpiresAt?.slice(0, 10) ?? '',
    },
  })
  const method = watch('method')
  const plan = watch('plan')

  const onSubmit = async (form: PaymentForm) => {
    try {
      await paymentMutation.mutateAsync({
        id: organization.id,
        data: {
          paidAt: new Date(`${form.paidAt}T12:00:00.000Z`).toISOString(),
          amount: form.amount,
          method: form.method,
          plan: form.plan,
          newPlanExpiresAt: endOfDayUtc(form.newPlanExpiresAt),
        },
      })
      onOpenChange(false)
    } catch (error) {
      handleApiError(error)
    }
  }

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) reset()
    onOpenChange(nextOpen)
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Registrar pago del plan</SheetTitle>
          <SheetDescription>
            Guarda el pago recibido fuera de la aplicación para {organization.name}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-4">
            <div className="space-y-2">
              <Label htmlFor="plan-payment-date">Fecha del pago</Label>
              <Input id="plan-payment-date" type="date" {...register('paidAt')} />
              {errors.paidAt && (
                <p className="text-sm text-destructive">{errors.paidAt.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-payment-amount">Monto en USD</Label>
              <Input
                id="plan-payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
              />
              {errors.amount && (
                <p className="text-sm text-destructive">{errors.amount.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-payment-method">Método</Label>
              <Select
                value={method}
                onValueChange={(value: OrganizationPlanPaymentMethod) => setValue('method', value)}
              >
                <SelectTrigger id="plan-payment-method">
                  <SelectValue placeholder="Selecciona un método" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="transferencia">Transferencia</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                  <SelectItem value="efectivo">Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-payment-plan">Plan pagado</Label>
              <Select
                value={plan}
                onValueChange={(value: BusinessPlanKey) => setValue('plan', value)}
              >
                <SelectTrigger id="plan-payment-plan">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(BUSINESS_PLANS).map(([key, item]) => (
                    <SelectItem key={key} value={key}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-payment-expires">Nuevo vencimiento</Label>
              <Input
                id="plan-payment-expires"
                type="date"
                {...register('newPlanExpiresAt')}
              />
              {errors.newPlanExpiresAt && (
                <p className="text-sm text-destructive">{errors.newPlanExpiresAt.message}</p>
              )}
            </div>
          </div>
          <SheetFooter>
            <Button
              type="submit"
              disabled={isSubmitting || paymentMutation.isPending}
            >
              {isSubmitting || paymentMutation.isPending ? 'Guardando...' : 'Registrar pago'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
