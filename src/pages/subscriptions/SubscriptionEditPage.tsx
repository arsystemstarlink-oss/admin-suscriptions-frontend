import { useState, useEffect } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useSubscriptionDetail, useUpdateSubscription } from '@/hooks/useSubscriptions'
import { usePlans } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'

const subscriptionEditSchema = z.object({
  planId: z.string().min(1, 'Seleccione un plan'),
  kitNumber: z.string().min(1, 'El número de kit es requerido'),
  accountNumber: z.string().optional(),
  billingDay: z.coerce.number().min(1, 'Debe ser entre 1 y 28').max(28, 'Debe ser entre 1 y 28'),
  maxOverduePeriods: z.coerce.number().min(1).max(12).optional(),
})

type SubscriptionEditForm = z.infer<typeof subscriptionEditSchema>

export function SubscriptionEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: subscriptionData, isLoading: isLoadingSub } = useSubscriptionDetail(id!)
  const updateMutation = useUpdateSubscription()
  const { data: plansData } = usePlans({ active: true, limit: 100 })
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SubscriptionEditForm>({
    resolver: zodResolver(subscriptionEditSchema),
  })

  useEffect(() => {
    if (subscriptionData?.subscription) {
      const sub = subscriptionData.subscription
      setValue('planId', sub.planId)
      setValue('kitNumber', sub.kitNumber)
      setValue('accountNumber', sub.accountNumber || '')
      setValue('billingDay', sub.billingDay)
      setValue('maxOverduePeriods', sub.maxOverduePeriods)
    }
  }, [subscriptionData, setValue])

  const onSubmit = async (formData: SubscriptionEditForm) => {
    if (!id) return
    setError(null)

    try {
      await updateMutation.mutateAsync({
        id,
        data: {
          planId: formData.planId,
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

  if (isLoadingSub) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-64 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  const plans = plansData?.plans || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/subscriptions/${id}`}>
            <ArrowLeft className="h-5 w-5 shrink-0" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Editar Suscripción</h1>
          <p className="text-muted-foreground mt-1">
            {subscriptionData?.subscription.kitNumber
              ? `Kit #${subscriptionData.subscription.kitNumber}`
              : 'Modificar configuración'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración de Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan *</Label>
                <Select onValueChange={(value) => setValue('planId', value)}>
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
                {errors.planId && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.planId.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="kitNumber">Número de Kit *</Label>
                <Input id="kitNumber" {...register('kitNumber')} placeholder="Ej: KIT-001" />
                {errors.kitNumber && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.kitNumber.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Número de Cuenta Starlink</Label>
                <Input id="accountNumber" {...register('accountNumber')} placeholder="Ej: ACC-8381534-78084-24" />
                <p className="text-xs text-muted-foreground">Opcional. Número de cuenta del servicio Starlink.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="billingDay">Día de Corte * (1-28)</Label>
                <Input id="billingDay" type="number" min={1} max={28} {...register('billingDay')} />
                {errors.billingDay && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.billingDay.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxOverduePeriods">Máx. Períodos Vencidos</Label>
                <Input
                  id="maxOverduePeriods"
                  type="number"
                  min={1}
                  max={12}
                  {...register('maxOverduePeriods')}
                />
                <p className="text-xs text-muted-foreground">Predeterminado: 2. Se suspende al exceder.</p>
              </div>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-300">
              <strong>Nota:</strong> El cambio de plan aplicará al próximo período de facturación.
            </div>

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
