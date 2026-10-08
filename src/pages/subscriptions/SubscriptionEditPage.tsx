import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSubscriptionDetail, useUpdateSubscription } from '@/hooks/useSubscriptions'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { usePlans } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CalendarDays, LockKeyhole, Minus, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'
import { DetailNav } from '@/components/design-system/DetailNav'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'

const subscriptionEditSchema = z.object({
  planId: z.string().min(1, 'Seleccione un plan'),
  kitNumber: z.string().min(1, 'El número de kit es requerido'),
  accountNumber: z.string().optional(),
  billingDay: z.coerce.number().min(1, 'Debe ser entre 1 y 28').max(28, 'Debe ser entre 1 y 28'),
  maxOverduePeriods: z.coerce.number().min(1).max(3).optional(),
})

type SubscriptionEditForm = z.infer<typeof subscriptionEditSchema>

export function SubscriptionEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((s) => s.selectedOrganizationId)
  const { data: subscriptionData, isLoading: isLoadingSub } = useSubscriptionDetail(id!, organizationId ?? undefined, {
    enabled: !isSuperAdmin || !!organizationId,
  })
  const updateMutation = useUpdateSubscription()
  const { data: plansData } = usePlans(
    { active: true, limit: 100, organizationId: organizationId ?? undefined },
    { enabled: !isSuperAdmin || !!organizationId },
  )
  const [error, setError] = useState<string | null>(null)
  const [isBillingDayPickerOpen, setIsBillingDayPickerOpen] = useState(false)
  const subscription = subscriptionData?.subscription
  const initialPlanId = subscription?.planId || subscription?.plan.id || ''

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionEditForm>({
    resolver: zodResolver(subscriptionEditSchema),
    values: subscription
      ? {
          planId: initialPlanId,
          kitNumber: subscription.kitNumber,
          accountNumber: subscription.accountNumber || '',
          billingDay: subscription.billingDay,
          maxOverduePeriods: subscription.maxOverduePeriods,
        }
      : undefined,
  })
  const selectedPlanId = watch('planId') || initialPlanId

  const onSubmit = async (formData: SubscriptionEditForm) => {
    if (!id) return
    setError(null)

    try {
      await updateMutation.mutateAsync({
        id,
        organizationId: subscription?.organizationId ?? organizationId ?? undefined,
        data: {
          planId: formData.planId || initialPlanId,
          kitNumber: formData.kitNumber,
          accountNumber: formData.accountNumber || undefined,
          billingDay: formData.billingDay,
          maxOverduePeriods: formData.maxOverduePeriods || 2,
        },
      })
      toast.success('Suscripción actualizada correctamente')
      navigate(`/subscriptions/${id}`)
    } catch (err: unknown) {
      handleApiError(err, { setFieldError: setError })
    }
  }

  if (isSuperAdmin && !organizationId) {
    return (
      <OrganizationSelectionEmptyState description="Elige una organización para editar la suscripción." />
    )
  }

  if (isLoadingSub) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!subscriptionData?.subscription) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-destructive">No pudimos cargar los datos de la suscripción para editarla.</p>
        <Button variant="outline" asChild>
          <Link to={`/subscriptions/${id}`}>Volver a la suscripción</Link>
        </Button>
      </div>
    )
  }

  const activePlans = plansData?.plans || []
  const currentPlan = subscription?.plan
  const plans = currentPlan && !activePlans.some((plan) => plan.id === currentPlan.id)
    ? [...activePlans, currentPlan]
    : activePlans

  return (
    <div className="space-y-6">
      <DetailNav
        backTo={`/subscriptions/${id}`}
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Editar Suscripción</h1>
            <p className="text-sm text-muted-foreground">
              {subscription?.kitNumber || 'Modificar configuración'}
            </p>
          </div>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Configuración de Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan *</Label>
                <Controller
                  name="planId"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || initialPlanId} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccione un plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {plans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name} — ${plan.price}/mes
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.planId && (
                  <p className="text-sm text-destructive">{errors.planId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label id="kitNumber-label">Número de Kit</Label>
                <div
                  role="textbox"
                  aria-labelledby="kitNumber-label"
                  aria-readonly="true"
                  tabIndex={0}
                  className="flex min-h-10 items-center justify-between rounded-md border border-border bg-surface-muted px-3 py-2 text-sm text-foreground select-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <span>{subscriptionData.subscription.kitNumber}</span>
                  <LockKeyhole className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </div>
                <p className="text-xs text-muted-foreground">Identificador fijo; no se puede modificar.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Número de Cuenta Starlink</Label>
                <Input id="accountNumber" {...register('accountNumber')} placeholder="Ej: ACC-8381534-78084-24" />
                <p className="text-xs text-muted-foreground">Opcional. Número de cuenta del servicio Starlink.</p>
              </div>

              <div className="space-y-2">
                <Controller
                  name="billingDay"
                  control={control}
                  render={({ field }) => (
                    <Dialog open={isBillingDayPickerOpen} onOpenChange={setIsBillingDayPickerOpen}>
                      <div className="space-y-2">
                        <Label htmlFor="billingDay">Día de Corte *</Label>
                        <Button
                          id="billingDay"
                          type="button"
                          variant="outline"
                          aria-haspopup="dialog"
                          aria-expanded={isBillingDayPickerOpen}
                          onClick={() => setIsBillingDayPickerOpen(true)}
                          className="w-full justify-between border-input bg-surface-muted text-foreground hover:bg-surface-hover"
                        >
                          <span>Día {field.value}</span>
                          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                        </Button>
                        <p className="text-xs text-muted-foreground">Elige un día del mes, del 1 al 28.</p>
                        <DialogContent className="max-w-sm">
                          <DialogHeader>
                            <DialogTitle>Selecciona el día de corte</DialogTitle>
                            <DialogDescription>Elige un número del 1 al 28.</DialogDescription>
                          </DialogHeader>
                          <div className="grid grid-cols-7 gap-2" role="group" aria-label="Días disponibles">
                            {Array.from({ length: 28 }, (_, index) => index + 1).map((day) => {
                              const isSelected = field.value === day
                              return (
                                <Button
                                  key={day}
                                  type="button"
                                  variant={isSelected ? 'default' : 'outline'}
                                  aria-pressed={isSelected}
                                  onClick={() => {
                                    field.onChange(day)
                                    setIsBillingDayPickerOpen(false)
                                  }}
                                  className="h-10 w-full px-0"
                                >
                                  {day}
                                </Button>
                              )
                            })}
                          </div>
                        </DialogContent>
                      </div>
                    </Dialog>
                  )}
                />
                {errors.billingDay && (
                  <p className="text-sm text-destructive">{errors.billingDay.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Controller
                  name="maxOverduePeriods"
                  control={control}
                  render={({ field }) => {
                    const value = field.value ?? 2
                    return (
                      <div className="space-y-2">
                        <Label htmlFor="maxOverduePeriods">Máx. Períodos Vencidos</Label>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Disminuir períodos vencidos"
                            disabled={value <= 1}
                            onClick={() => field.onChange(Math.max(1, value - 1))}
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
                            className="text-center font-semibold"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            aria-label="Aumentar períodos vencidos"
                            disabled={value >= 3}
                            onClick={() => field.onChange(Math.min(3, value + 1))}
                          >
                            <Plus aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    )
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Predeterminado: 2. La suscripción se suspende al alcanzar el límite elegido.
                </p>
              </div>
            </div>

            {selectedPlanId !== initialPlanId && (
              <div className="p-3 bg-info/10 border border-info/20 rounded-md text-sm text-info">
                <strong>Nota:</strong> El cambio de plan aplicará al próximo período de facturación.
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Actualizando...' : 'Actualizar Suscripción'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={`/subscriptions/${id}`}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
