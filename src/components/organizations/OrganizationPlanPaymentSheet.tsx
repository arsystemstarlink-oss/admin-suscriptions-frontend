import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useEffect } from 'react'
import {
  useOrganizationDetail,
  useRegisterOrganizationPlanPayment,
} from '@/hooks/useOrganizations'
import { useBusinessPlans, useOrganizationPlanQuote } from '@/hooks/useOrganizationPlanPaymentReports'
import { CUSTOM_PLAN_MIN_CLIENTS, formatCurrency, formatDate } from '@/lib/constants'
import {
  BUSINESS_PLAN_KEYS,
  getCatalogItem,
  getPlanClientLimit,
  getPlanLabel,
} from '@/lib/business-plan-catalog'
import { MAX_PREPAID_MONTHS } from '@/lib/business-plan'
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

function defaultClientLimit(
  plan: BusinessPlanKey,
  clientCount: number,
  plans: Parameters<typeof getPlanClientLimit>[0],
): number {
  const planLimit = getPlanClientLimit(plans, plan)
  if (planLimit !== null) return planLimit
  return Math.max(CUSTOM_PLAN_MIN_CLIENTS, clientCount)
}

export function OrganizationPlanPaymentSheet({
  organization,
  open,
  onOpenChange,
}: OrganizationPlanPaymentSheetProps) {
  const paymentMutation = useRegisterOrganizationPlanPayment()
  const { data: detailData, isFetching: detailFetching } = useOrganizationDetail(organization.id)
  const liveOrganization = detailData?.organization ?? organization
  const { data: catalogData } = useBusinessPlans()
  const catalog = catalogData?.plans
  const priceForPlan = (key: BusinessPlanKey) =>
    catalog?.find((item) => item.key === key)?.priceUsdMonthly ?? null
  const hasClientCount = typeof liveOrganization.clientCount === 'number'
  const clientCount = liveOrganization.clientCount ?? 0
  const currentCapacity = liveOrganization.clientLimit ?? 0
  const initialPlan = liveOrganization.plan ?? 'basico'

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
      clientLimit: defaultClientLimit(initialPlan, clientCount, catalog),
      months: 1,
    },
  })
  const method = watch('method')
  const plan = watch('plan')
  const clientLimit = watch('clientLimit')
  const paidAt = watch('paidAt')
  const months = watch('months')
  const amount = watch('amount')
  const isCustomPlan = plan === 'a-medida'
  const monthlyPrice = priceForPlan(plan)
  const renewalMonths = Number.isInteger(months) && months > 0 ? months : 1
  const totalAmount = monthlyPrice !== null ? monthlyPrice * renewalMonths : null
  const quoteQuery = useOrganizationPlanQuote(
    {
      organizationId: liveOrganization.id,
      plan,
      paidAt: paidAt || new Date().toISOString().slice(0, 10),
    },
    open,
  )
  const quote = quoteQuery.data?.quote
  const quoteReady =
    Boolean(quote) && !quoteQuery.isFetching && !quoteQuery.isPlaceholderData
  const planLocked = quote?.planLocked ?? false
  const billingDay = quote?.billingDay ?? null
  const allowedPlanKeys = BUSINESS_PLAN_KEYS.filter((key) => {
    if (key === liveOrganization.plan) return true
    const fixedLimit = getPlanClientLimit(catalog, key)
    if (fixedLimit !== null && clientCount > fixedLimit) return false
    if (planLocked && fixedLimit !== null && fixedLimit < currentCapacity) return false
    return true
  })
  const planChanged = quote?.planChanged ?? false
  const currentExpiry = quote?.currentExpiry ?? null
  const extendsCurrent = quote?.extendsCurrent ?? false
  const quoteExpiration = (value: number) =>
    quote?.expirations.find((expiration) => expiration.months === value)
  const computedExpiration = quoteExpiration(renewalMonths)
  const computedExpiry = computedExpiration
    ? new Date(computedExpiration.newPlanExpiresAt)
    : null
  const maxExpiry = quote ? new Date(quote.maxPlanExpiresAt) : null
  const prepaidLimitExceeded = computedExpiration?.exceedsPrepaidLimit ?? false
  const summaryAmount =
    totalAmount !== null
      ? formatCurrency(totalAmount)
      : isCustomPlan && Number.isFinite(amount) && amount > 0
        ? formatCurrency(amount)
        : '—'
  const planClientLimit = getPlanClientLimit(catalog, plan)
  const effectiveLimit = planClientLimit ?? clientLimit ?? clientCount
  const planExceedsUsage = effectiveLimit < clientCount
  const downgradeBlocked = planLocked && effectiveLimit < currentCapacity

  useEffect(() => {
    if (totalAmount === null) return
    setValue('amount', totalAmount, { shouldValidate: true })
  }, [totalAmount, setValue])

  const onSubmit = async (form: PaymentForm) => {
    const limit = getPlanClientLimit(catalog, form.plan) ?? form.clientLimit ?? clientCount
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
    liveOrganization.planStatus === 'prueba'
      ? currentExpiry
        ? `La prueba está vigente hasta ${formatDate(currentExpiry)}. Solo puedes renovar o subir de plan.`
        : 'La prueba está vigente. Solo puedes renovar o subir de plan.'
      : currentExpiry
        ? `El plan está vigente hasta ${formatDate(currentExpiry)}. Solo puedes renovarlo o subir de plan.`
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
                {getPlanLabel(catalog, liveOrganization.plan)}
              </span>{' '}
              ·{' '}
              {hasClientCount
                ? `${clientCount} ${clientCount === 1 ? 'cliente' : 'clientes'} en uso`
                : 'uso de clientes no disponible'}{' '}
              · corte día {billingDay ?? '…'}
            </div>
            {!hasClientCount && (
              <p
                className={
                  detailFetching ? 'text-xs text-muted-foreground' : 'text-xs text-warning'
                }
              >
                {detailFetching
                  ? 'Consultando el uso de clientes...'
                  : 'No se pudo leer el conteo de clientes de esta organización. El servidor validará el límite al registrar el pago.'}
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor="plan-payment-plan">Plan a pagar</Label>
              <Select
                value={plan}
                onValueChange={(value: BusinessPlanKey) => {
                  setValue('plan', value)
                  setValue(
                    'clientLimit',
                    defaultClientLimit(value, clientCount, catalog),
                    { shouldValidate: true },
                  )
                  if (value === 'a-medida') {
                    setValue('amount', 0)
                  }
                }}
              >
                <SelectTrigger id="plan-payment-plan">
                  <SelectValue placeholder="Selecciona un plan" />
                </SelectTrigger>
                <SelectContent>
                  {allowedPlanKeys.map((key) => {
                    const item = getCatalogItem(catalog, key)
                    return (
                      <SelectItem key={key} value={key}>
                        {getPlanLabel(catalog, key)}
                        {item?.clientLimit !== null && item?.clientLimit !== undefined
                          ? ` · hasta ${item.clientLimit} clientes`
                          : ' · tope personalizado'}
                        {key === liveOrganization.plan ? ' · actual' : ''}
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
                  {hasClientCount
                    ? `Puedes elegir cualquier plan que cubra tus ${clientCount} clientes actuales.`
                    : 'El servidor validará que el plan cubra los clientes actuales.'}
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
                  Mínimo {CUSTOM_PLAN_MIN_CLIENTS} clientes. Uso actual:{' '}
                  {hasClientCount ? clientCount : 'no disponible'}.
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
                  {[1, 3, 6, 12].map((value) => {
                    const exceedsPrepaidLimit =
                      quoteExpiration(value)?.exceedsPrepaidLimit ?? false
                    return (
                      <SelectItem
                        key={value}
                        value={String(value)}
                        disabled={exceedsPrepaidLimit}
                      >
                        {value} {value === 1 ? 'mes' : 'meses'}
                        {exceedsPrepaidLimit ? ' · supera el tope' : ''}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Máximo {MAX_PREPAID_MONTHS} meses prepagados por organización.
              </p>
              {prepaidLimitExceeded && maxExpiry && (
                <p className="text-xs text-warning">
                  Este pago supera el tope. El vencimiento máximo permitido es{' '}
                  {formatDate(maxExpiry.toISOString())}.
                </p>
              )}
              {errors.months && (
                <p className="text-sm text-destructive">{errors.months.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-sm font-medium">Nuevo vencimiento</p>
              <p className="text-base font-semibold">
                {computedExpiry ? formatDate(computedExpiry.toISOString()) : 'Calculando...'}
              </p>
              <p className="text-xs text-muted-foreground">
                {planChanged
                  ? 'El cambio de plan inicia en la fecha de pago; no se suma el tiempo del plan anterior.'
                  : extendsCurrent && currentExpiry
                    ? `Se suman ${renewalMonths} ${renewalMonths === 1 ? 'mes' : 'meses'} al vencimiento actual del ${formatDate(currentExpiry)}.`
                    : `Se calcula desde la fecha de pago con el día de corte ${billingDay ?? '…'} de cada mes.`}
              </p>
              {quoteQuery.isError && (
                <p className="text-xs text-destructive">
                  No pudimos calcular la cotización. Revisa la fecha e intenta de nuevo.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-payment-date">Fecha del pago</Label>
              <Input id="plan-payment-date" type="date" {...register('paidAt')} />
              {errors.paidAt && (
                <p className="text-sm text-destructive">{errors.paidAt.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-payment-amount">Monto total en USD</Label>
              <Input
                id="plan-payment-amount"
                type="number"
                min="0.01"
                step="0.01"
                readOnly={!isCustomPlan}
                aria-describedby="plan-payment-amount-help"
                {...register('amount', { valueAsNumber: true })}
              />
              <p id="plan-payment-amount-help" className="text-xs text-muted-foreground">
                {isCustomPlan ? (
                  'Ingresa el monto total acordado por los meses seleccionados.'
                ) : monthlyPrice !== null && totalAmount !== null ? (
                  <>
                    Precio fijo: {formatCurrency(monthlyPrice)}/mes × {renewalMonths}{' '}
                    {renewalMonths === 1 ? 'mes' : 'meses'} ={' '}
                    <span className="font-medium text-foreground">
                      {formatCurrency(totalAmount)}
                    </span>
                    .
                  </>
                ) : (
                  'Cargando precio del plan...'
                )}
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

            <div className="rounded-lg border border-border-subtle bg-surface-muted p-3 text-sm">
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                Resumen del pago
              </p>
              <dl className="space-y-1">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Plan</dt>
                  <dd className="font-medium">
                    {getPlanLabel(catalog, plan)}
                    {plan === liveOrganization.plan ? ' · renovación' : ' · cambio'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Meses</dt>
                  <dd className="font-medium">
                    {renewalMonths} {renewalMonths === 1 ? 'mes' : 'meses'}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Total</dt>
                  <dd className="font-semibold">{summaryAmount}</dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-muted-foreground">Nuevo vencimiento</dt>
                  <dd className="font-medium">
                    {computedExpiry ? formatDate(computedExpiry.toISOString()) : 'Calculando...'}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          <SheetFooter>
            <Button
              type="submit"
              disabled={
                isSubmitting ||
                paymentMutation.isPending ||
                planExceedsUsage ||
                downgradeBlocked ||
                prepaidLimitExceeded ||
                !quoteReady ||
                !computedExpiry ||
                (!isCustomPlan && totalAmount === null)
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
