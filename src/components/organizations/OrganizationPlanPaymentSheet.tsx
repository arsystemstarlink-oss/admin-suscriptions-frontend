import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect, useRef } from 'react'
import {
  useRegisterOrganizationPlanPayment,
} from '@/hooks/useOrganizations'
import { useBusinessPlans } from '@/hooks/useOrganizationPlanPaymentReports'
import { BUSINESS_PLANS, CUSTOM_PLAN_MIN_CLIENTS, formatDate } from '@/lib/constants'
import {
  getOrganizationBillingDay,
  isOrganizationPlanLocked,
  resolveOrganizationPlanExpiration,
} from '@/lib/business-plan'
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
  clientLimit: z.number().int().positive('El tope debe ser mayor que cero').optional(),
  months: z.number().int().min(1, 'Indica al menos un mes').max(12, 'Máximo 12 meses'),
}).superRefine((data, context) => {
  if (
    data.plan === 'a-medida' &&
    (!data.clientLimit || data.clientLimit < CUSTOM_PLAN_MIN_CLIENTS)
  ) {
    context.addIssue({
      code: 'custom',
      path: ['clientLimit'],
      message: `El plan A medida requiere un tope de al menos ${CUSTOM_PLAN_MIN_CLIENTS} clientes`,
    })
  }
})

type PaymentForm = z.infer<typeof paymentSchema>

interface OrganizationPlanPaymentSheetProps {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}

function defaultClientLimit(plan: BusinessPlanKey, clientCount: number): number {
  const planLimit = BUSINESS_PLANS[plan].clientLimit
  if (planLimit !== null) return planLimit
  return Math.max(CUSTOM_PLAN_MIN_CLIENTS, clientCount)
}

export function OrganizationPlanPaymentSheet({
  organization,
  open,
  onOpenChange,
}: OrganizationPlanPaymentSheetProps) {
  const paymentMutation = useRegisterOrganizationPlanPayment()
  const { data: catalogData } = useBusinessPlans()
  const catalog = catalogData?.plans
  const priceForPlan = (key: BusinessPlanKey) =>
    catalog?.find((item) => item.key === key)?.priceUsdMonthly ?? null
  const priceInitialized = useRef(false)
  const clientCount = organization.clientCount ?? 0
  const currentCapacity = organization.clientLimit ?? 0
  const billingDay = getOrganizationBillingDay(organization)
  const planLocked = isOrganizationPlanLocked(organization)

  const allowedPlanKeys = (Object.keys(BUSINESS_PLANS) as BusinessPlanKey[]).filter((key) => {
    const fixedLimit = BUSINESS_PLANS[key].clientLimit
    if (fixedLimit !== null && clientCount > fixedLimit) return false
    if (planLocked && fixedLimit !== null && fixedLimit < currentCapacity) return false
    return true
  })
  const initialPlan = allowedPlanKeys.includes(organization.plan ?? 'basico')
    ? organization.plan ?? 'basico'
    : allowedPlanKeys[0] ?? 'basico'

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PaymentForm>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      paidAt: new Date().toISOString().slice(0, 10),
      amount: 0,
      method: 'transferencia',
      plan: initialPlan,
      clientLimit: defaultClientLimit(initialPlan, clientCount),
      months: 1,
    },
  })
  const method = watch('method')
  const plan = watch('plan')
  const clientLimit = watch('clientLimit')
  const paidAt = watch('paidAt')
  const months = watch('months')
  const planClientLimit = BUSINESS_PLANS[plan].clientLimit
  const effectiveLimit = planClientLimit ?? clientLimit ?? clientCount
  const planExceedsUsage = effectiveLimit < clientCount
  const downgradeBlocked = planLocked && effectiveLimit < currentCapacity
  const computedExpiry = resolveOrganizationPlanExpiration({
    organization,
    paidAt: new Date(`${paidAt || new Date().toISOString().slice(0, 10)}T12:00:00.000Z`),
    months: Number.isInteger(months) && months > 0 ? months : 1,
  })

  useEffect(() => {
    if (!catalog || priceInitialized.current) return
    const price = catalog.find((item) => item.key === plan)?.priceUsdMonthly
    if (price !== null && price !== undefined) {
      setValue('amount', price)
    }
    priceInitialized.current = true
  }, [catalog, plan, setValue])

  const onSubmit = async (form: PaymentForm) => {
    const limit = BUSINESS_PLANS[form.plan].clientLimit ?? form.clientLimit ?? clientCount
    if (planLocked && limit < currentCapacity) {
      setError('plan', {
        type: 'manual',
        message:
          'No puedes bajar de plan mientras la suscripción esté vigente. Renueva el plan actual o espera a su vencimiento.',
      })
      return
    }
    if (limit < clientCount) {
      setError('clientLimit', {
        type: 'manual',
        message: `La organización ya tiene ${clientCount} clientes y este plan permite hasta ${limit}.`,
      })
      return
    }
    try {
      await paymentMutation.mutateAsync({
        id: organization.id,
        data: {
          paidAt: new Date(`${form.paidAt}T12:00:00.000Z`).toISOString(),
          amount: form.amount,
          method: form.method,
          plan: form.plan,
          clientLimit: form.plan === 'a-medida' ? form.clientLimit : undefined,
          months: form.months,
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

  const lockMessage =
    organization.planStatus === 'prueba'
      ? organization.trialEndsAt
        ? `La prueba está vigente hasta ${formatDate(organization.trialEndsAt)}. Solo puedes renovar o subir de plan.`
        : 'La prueba está vigente. Solo puedes renovar o subir de plan.'
      : organization.planExpiresAt
        ? `El plan está vigente hasta ${formatDate(organization.planExpiresAt)}. Solo puedes renovarlo o subir de plan.`
        : 'La suscripción está vigente. Solo puedes renovarla o subir de plan.'

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Pago y plan</SheetTitle>
          <SheetDescription>
            Renueva o cambia el plan de {organization.name}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-1 flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-4">
            <div className="text-sm text-muted-foreground">
              Plan actual: <span className="font-medium text-foreground">
                {BUSINESS_PLANS[organization.plan ?? 'basico'].label}
              </span>{' '}
              · {clientCount} clientes en uso · corte día {billingDay}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-payment-plan">Plan a pagar</Label>
              <Select
                value={plan}
                onValueChange={(value: BusinessPlanKey) => {
                  setValue('plan', value)
                  setValue(
                    'clientLimit',
                    defaultClientLimit(value, clientCount),
                    { shouldValidate: true },
                  )
                  setValue('amount', priceForPlan(value) ?? 0)
                }}
              >
                <SelectTrigger id="plan-payment-plan">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {allowedPlanKeys.map((key) => {
                    const item = BUSINESS_PLANS[key]
                    return (
                      <SelectItem key={key} value={key}>
                        {item.label}
                        {item.clientLimit !== null
                          ? ` · hasta ${item.clientLimit} clientes`
                          : ' · tope personalizado'}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {errors.plan && (
                <p className="text-sm text-destructive">{errors.plan.message}</p>
              )}
              {planLocked ? (
                <p className="text-xs text-muted-foreground">{lockMessage}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Puedes elegir cualquier plan que cubra tus {clientCount} clientes actuales.
                </p>
              )}
            </div>

            {plan === 'a-medida' ? (
              <div className="space-y-2">
                <Label htmlFor="plan-payment-client-limit">Tope de clientes (A medida)</Label>
                <Input
                  id="plan-payment-client-limit"
                  type="number"
                  min={CUSTOM_PLAN_MIN_CLIENTS}
                  step={1}
                  aria-describedby="plan-payment-client-limit-help"
                  {...register('clientLimit', { valueAsNumber: true })}
                />
                <p id="plan-payment-client-limit-help" className="text-xs text-muted-foreground">
                  Mínimo {CUSTOM_PLAN_MIN_CLIENTS} clientes. Uso actual: {clientCount}.
                </p>
                {downgradeBlocked && (
                  <p className="text-sm text-destructive">
                    No puedes asignar un tope menor al del plan vigente ({currentCapacity}).
                  </p>
                )}
                {planExceedsUsage && (
                  <p className="text-sm text-destructive">
                    El tope no puede ser menor que los {clientCount} clientes actuales.
                  </p>
                )}
                {errors.clientLimit && (
                  <p className="text-sm text-destructive">{errors.clientLimit.message}</p>
                )}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="plan-payment-months">Meses a renovar</Label>
              <Select
                value={String(months)}
                onValueChange={(value) => setValue('months', Number(value), { shouldValidate: true })}
              >
                <SelectTrigger id="plan-payment-months">
                  <SelectValue placeholder="Selecciona los meses" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 3, 6, 12].map((value) => (
                    <SelectItem key={value} value={String(value)}>
                      {value} {value === 1 ? 'mes' : 'meses'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.months && (
                <p className="text-sm text-destructive">{errors.months.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Nuevo vencimiento</p>
              <p className="text-base font-semibold">{formatDate(computedExpiry.toISOString())}</p>
              <p className="text-xs text-muted-foreground">
                Se calcula automáticamente con el día de corte {billingDay} de cada mes.
              </p>
            </div>

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
                readOnly={priceForPlan(plan) !== null}
                {...register('amount', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                {priceForPlan(plan) !== null
                  ? `Precio fijo del plan: ${priceForPlan(plan)} USD.`
                  : 'Ingresa el monto acordado para este plan.'}
              </p>
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
          </div>
          <SheetFooter>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                paymentMutation.isPending ||
                planExceedsUsage ||
                downgradeBlocked
              }
            >
              {isSubmitting || paymentMutation.isPending ? 'Guardando...' : 'Registrar pago'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  )
}
