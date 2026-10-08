import { useState, useMemo, useEffect, type ChangeEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Controller, useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateSubscription } from '@/hooks/useSubscriptions'
import { useClients } from '@/hooks/useClients'
import { usePlans } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { AlertTriangle, Plus, Minus, Trash2, Box, CalendarDays, DollarSign, Clock, Users } from 'lucide-react'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'
import { DetailNav } from '@/components/design-system/DetailNav'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import { PaymentMethod } from '@/types/api'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { SuperAdminOrganizationField } from '@/components/organizations/SuperAdminOrganizationField'

const subscriptionSchema = z.object({
  organizationId: z.string().optional(),
  clientId: z.string().min(1, 'Seleccione un cliente'),
  planId: z.string().min(1, 'Seleccione un plan'),
  kitNumber: z.string().min(5, 'Ingrese el número de kit (ej: KIT-001)'),
  accountNumber: z.string().optional(),
  billingDay: z.coerce.number().min(1, 'Debe ser entre 1 y 28').max(28, 'Debe ser entre 1 y 28'),
  maxOverduePeriods: z.coerce.number().min(1).max(3).optional(),
  activationDate: z.string().optional(),
  historicalPayments: z.array(z.object({
    periodLabel: z.string().min(1, 'Etiqueta requerida'),
    startDate: z.string().min(1, 'Fecha de inicio requerida'),
    endDate: z.string().min(1, 'Fecha de fin requerida'),
    amount: z.coerce.number().min(0.01, 'Monto requerido'),
    paidAt: z.string().min(1, 'Fecha de pago requerida'),
    paymentMethod: z.string().min(1, 'Método de pago requerido'),
  })).optional(),
})

type SubscriptionForm = z.infer<typeof subscriptionSchema>

export function SubscriptionFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedClientId = searchParams.get('clientId')
  const isSuperAdmin = useIsSuperAdmin()
  const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const createMutation = useCreateSubscription()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionForm>({
    resolver: zodResolver(subscriptionSchema),
    defaultValues: {
      organizationId: isSuperAdmin ? selectedOrganizationId ?? undefined : undefined,
      maxOverduePeriods: 2,
      historicalPayments: [],
    },
  })

  const organizationId = watch('organizationId')
  const orgEnabled = !isSuperAdmin || !!organizationId
  const { data: clientsData } = useClients(
    { limit: 100, organizationId: organizationId || undefined },
    { enabled: orgEnabled },
  )
  const { data: plansData } = usePlans(
    { active: true, limit: 100, organizationId: organizationId || undefined },
    { enabled: orgEnabled },
  )

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'historicalPayments',
  })

  const planId = watch('planId')
  const activationDate = watch('activationDate')
  const selectedPlan = plansData?.plans.find(p => p.id === planId)

  const kitNumberValue = watch('kitNumber')
  const accountNumberValue = watch('accountNumber')

  const normalizePrefixedValue = (raw: string, prefix: string) =>
    raw
      .toUpperCase()
      .replace(new RegExp(`^${prefix}-?`), '')
      .replace(/[^A-Z0-9-]/g, '')
      .replace(/^-+/, '')

  const handleKitNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue('kitNumber', `KIT-${normalizePrefixedValue(e.target.value, 'KIT')}`, { shouldValidate: true })
  }

  const handleAccountNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    setValue('accountNumber', `ACC-${normalizePrefixedValue(e.target.value, 'ACC')}`, { shouldValidate: true })
  }

  const isRetroactive = useMemo(() => {
    if (!activationDate) return false
    const today = new Date()
    const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
    const activation = new Date(activationDate)
    const activationUTC = Date.UTC(activation.getUTCFullYear(), activation.getUTCMonth(), activation.getUTCDate())
    const diffTime = todayUTC - activationUTC
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    return diffDays > 1
  }, [activationDate])

  const onSubmit = async (formData: SubscriptionForm) => {
    setError(null)

    if (isSuperAdmin && !formData.organizationId) {
      setError('Debe indicar la organización de destino.')
      return
    }

    try {
      const request = {
        ...(formData.organizationId ? { organizationId: formData.organizationId } : {}),
        clientId: formData.clientId,
        planId: formData.planId,
        kitNumber: formData.kitNumber,
        accountNumber: formData.accountNumber || undefined,
        billingDay: formData.billingDay,
        maxOverduePeriods: formData.maxOverduePeriods || 2,
        ...(isRetroactive && formData.activationDate ? {
          activationDate: formData.activationDate,
          historicalPayments: formData.historicalPayments?.map(p => ({
            periodLabel: p.periodLabel,
            startDate: p.startDate,
            endDate: p.endDate,
            amount: p.amount,
            paidAt: p.paidAt,
            paymentMethod: p.paymentMethod as PaymentMethod,
          })),
        } : {}),
      }

      await createMutation.mutateAsync(request)
      toast.success('Suscripción creada correctamente')
      navigate('/subscriptions')
    } catch (err: unknown) {
      handleApiError(err, { setFieldError: setError })
    }
  }

  const handleAddHistoricalPayment = () => {
    append({
      periodLabel: '',
      startDate: '',
      endDate: '',
      amount: selectedPlan?.price || 0,
      paidAt: '',
      paymentMethod: '',
    })
  }

  const clients = useMemo(
    () => [...(clientsData?.clients || [])].sort((a, b) =>
      getClientFullName(a).localeCompare(getClientFullName(b), 'es', { sensitivity: 'base' }),
    ),
    [clientsData?.clients],
  )
  const plans = plansData?.plans || []

  useEffect(() => {
    if (preselectedClientId && clientsData?.clients?.length) {
      const exists = clientsData.clients.some((c) => c.id === preselectedClientId)
      if (exists) {
        setValue('clientId', preselectedClientId)
      }
    }
  }, [preselectedClientId, clientsData, setValue])

  return (
    <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-background -mx-4 px-4 pt-2">
      <DetailNav
        backTo="/subscriptions"
        className="mb-4"
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Nueva Suscripción</h1>
            <p className="text-sm text-muted-foreground">Asociar cliente a plan</p>
          </div>
        }
      />

      <form id="subscription-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Bloque 1: Cliente y Plan */}
        <div className="bg-surface text-surface-foreground rounded-2xl border border-border p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            Datos Principales
          </h2>

          <SuperAdminOrganizationField control={control} error={errors.organizationId?.message} />

          <div className="space-y-2.5">
            <Label className="text-foreground">Cliente *</Label>
            <Select value={watch('clientId') || ''} onValueChange={(value) => setValue('clientId', value)}>
              <SelectTrigger
                className="h-12"
                disabled={isSuperAdmin && !organizationId}
              >
                <SelectValue placeholder={isSuperAdmin && !organizationId ? 'Seleccione primero la organización' : 'Seleccione un cliente'} />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="py-3">
                    {getClientFullName(client)} — {client.phone}{client.dni ? ` — C.I. ${client.dni}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-sm text-destructive font-medium">{errors.clientId.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label className="text-foreground">Plan *</Label>
            <Select onValueChange={(value) => setValue('planId', value)}>
              <SelectTrigger
                className="h-12"
                disabled={isSuperAdmin && !organizationId}
              >
                <SelectValue placeholder={isSuperAdmin && !organizationId ? 'Seleccione primero la organización' : 'Seleccione un plan'} />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id} className="py-3">
                    {plan.name} — ${plan.price}/mes
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.planId && (
              <p className="text-sm text-destructive font-medium">{errors.planId.message}</p>
            )}
          </div>
        </div>

        {/* Bloque 2: Equipo y Cuenta */}
        <div className="bg-surface text-surface-foreground rounded-2xl border border-border p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Box className="h-5 w-5 text-muted-foreground" />
            Datos del Equipo
          </h2>

          <div className="space-y-2.5">
            <Label htmlFor="kitNumber" className="text-foreground">Número de Kit *</Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 text-primary px-2 py-1 text-sm font-semibold">
                KIT-
              </span>
              <Input
                id="kitNumber"
                value={(kitNumberValue || '').replace(/^KIT-/, '')}
                onChange={handleKitNumberChange}
                placeholder="Ej: 001"
                className="pl-16 h-12 uppercase font-semibold tracking-wide"
                inputMode="text"
                autoCapitalize="characters"
              />
            </div>
            {errors.kitNumber && (
              <p className="text-sm text-destructive font-medium">{errors.kitNumber.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="accountNumber" className="text-foreground">Cuenta Starlink <span className="text-muted-foreground font-normal">(Opcional)</span></Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 rounded-md bg-primary/10 text-primary px-2 py-1 text-sm font-semibold">
                ACC-
              </span>
              <Input
                id="accountNumber"
                value={(accountNumberValue || '').replace(/^ACC-/, '')}
                onChange={handleAccountNumberChange}
                placeholder="Ej: 8381534-78084-24"
                className="pl-16 h-12 uppercase font-semibold tracking-wide"
                inputMode="text"
                autoCapitalize="characters"
              />
            </div>
          </div>
        </div>

        {/* Bloque 3: Facturación */}
        <div className="bg-surface text-surface-foreground rounded-2xl border border-border p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-muted-foreground" />
            Reglas de Facturación
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label htmlFor="billingDay" className="text-foreground">Día de Corte *</Label>
              <Input
                id="billingDay"
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                {...register('billingDay')}
                className="h-12 text-center font-bold text-lg"
              />
              {errors.billingDay && (
                <p className="text-sm text-destructive font-medium text-center">{errors.billingDay.message}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <Controller
                name="maxOverduePeriods"
                control={control}
                render={({ field }) => {
                  const value = field.value ?? 2
                  return (
                    <div className="space-y-2.5">
                      <Label htmlFor="maxOverduePeriods" className="text-foreground">Máx. Períodos Vencidos</Label>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Disminuir períodos vencidos"
                          disabled={value <= 1}
                          onClick={() => field.onChange(Math.max(1, value - 1))}
                          className="h-12 w-12 shrink-0"
                        >
                          <Minus aria-hidden="true" />
                        </Button>
                        <Input
                          id="maxOverduePeriods"
                          type="number"
                          inputMode="numeric"
                          min={1}
                          max={3}
                          value={value}
                          readOnly
                          aria-live="polite"
                          className="h-12 text-center text-lg font-bold"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          aria-label="Aumentar períodos vencidos"
                          disabled={value >= 3}
                          onClick={() => field.onChange(Math.min(3, value + 1))}
                          className="h-12 w-12 shrink-0"
                        >
                          <Plus aria-hidden="true" />
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Elige entre 1 y 3 períodos.</p>
                    </div>
                  )
                }}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-1">Si se excede el límite de vencidos, la suscripción se suspende automáticamente.</p>

          <div className="pt-2">
            <Label htmlFor="activationDate" className="text-foreground">Fecha de Activación</Label>
            <Input
              id="activationDate"
              type="date"
              {...register('activationDate')}
              max={new Date().toISOString().split('T')[0]}
              defaultValue={new Date().toISOString().split('T')[0]}
              className="mt-2.5 h-12"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Si la fecha es anterior a hoy, podrás agregar pagos históricos.
            </p>
          </div>
        </div>

        {/* Bloque 4: Retroactivo */}
        {isRetroactive && (
          <div className="bg-surface text-surface-foreground rounded-2xl border border-border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <Clock className="h-5 w-5 text-muted-foreground" />
                Pagos Históricos
              </h2>
              <button
                type="button"
                onClick={handleAddHistoricalPayment}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-secondary-foreground rounded-lg text-sm font-semibold active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Añadir
              </button>
            </div>

            {fields.length === 0 ? (
              <p className="text-sm text-muted-foreground bg-surface-muted p-3 rounded-lg border border-border-subtle italic text-center">
                Sin pagos históricos. Los períodos anteriores se generarán como pendientes.
              </p>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 bg-surface text-surface-foreground border border-border rounded-xl space-y-4 shadow-sm relative">

                    <div className="flex justify-between items-center border-b border-border pb-2">
                      <span className="font-semibold text-foreground">
                        Pago #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 text-destructive bg-destructive/10 rounded-md active:bg-destructive/20 touch-manipulation"
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">PERÍODO</Label>
                      <Input
                        {...register(`historicalPayments.${index}.periodLabel`)}
                        placeholder="Ej: Enero 2026"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">DESDE</Label>
                        <Input type="date" {...register(`historicalPayments.${index}.startDate`)} className="h-10 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">HASTA</Label>
                        <Input type="date" {...register(`historicalPayments.${index}.endDate`)} className="h-10 text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">MONTO</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
                          <Input
                            type="number"
                            step="0.01"
                            inputMode="decimal"
                            {...register(`historicalPayments.${index}.amount`)}
                            className="pl-8 h-10 text-sm font-semibold"
                          />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-muted-foreground">PAGADO EL</Label>
                        <Input type="date" {...register(`historicalPayments.${index}.paidAt`)} className="h-10 text-sm" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">MÉTODO</Label>
                      <Select onValueChange={(value) => setValue(`historicalPayments.${index}.paymentMethod`, value)}>
                        <SelectTrigger className="h-10 text-sm">
                          <SelectValue placeholder="Seleccione..." />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_METHOD_LABELS)
                            .filter(([key]) => key !== PaymentMethod.INITIAL_PAYMENT)
                            .map(([key, label]) => (
                              <SelectItem key={key} value={key}>{label}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </form>

      {/* Floating Action Button Bar (Fixed al fondo) */}
      <div className="fixed bottom-[var(--mobile-nav-h)] md:bottom-0 left-0 right-0 p-4 bg-surface/95 border-t border-border backdrop-blur-xl z-50">
        <Button
          type="submit"
          form="subscription-form"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creando Suscripción...' : 'Crear Suscripción'}
        </Button>
      </div>
    </div>
  )
}
