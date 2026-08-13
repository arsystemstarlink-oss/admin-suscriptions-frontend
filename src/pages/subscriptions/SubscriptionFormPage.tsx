import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateSubscription } from '@/hooks/useSubscriptions'
import { useClients } from '@/hooks/useClients'
import { usePlans } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'
import { PAYMENT_METHOD_LABELS } from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import { PaymentMethod } from '@/types/api'

const subscriptionSchema = z.object({
  clientId: z.string().min(1, 'Seleccione un cliente'),
  planId: z.string().min(1, 'Seleccione un plan'),
  kitNumber: z.string().min(1, 'El número de kit es requerido'),
  accountNumber: z.string().optional(),
  billingDay: z.coerce.number().min(1, 'Debe ser entre 1 y 28').max(28, 'Debe ser entre 1 y 28'),
  maxOverduePeriods: z.coerce.number().min(1).max(12).optional(),
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
  const createMutation = useCreateSubscription()
  const { data: clientsData } = useClients({ limit: 100 })
  const { data: plansData } = usePlans({ active: true, limit: 100 })
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
      maxOverduePeriods: 2,
      historicalPayments: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'historicalPayments',
  })

  const planId = watch('planId')
  const activationDate = watch('activationDate')
  const selectedPlan = plansData?.plans.find(p => p.id === planId)

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

    try {
      const request = {
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

  const clients = clientsData?.clients || []
  const plans = plansData?.plans || []

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/subscriptions">
            <ArrowLeft className="h-5 w-5 shrink-0" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Nueva Suscripción</h1>
          <p className="text-muted-foreground mt-1">Asociar un cliente a un plan</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuración de Suscripción</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select onValueChange={(value) => setValue('clientId', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {getClientFullName(client)} — {client.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.clientId && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.clientId.message}</p>
                )}
              </div>

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
                <p className="text-xs text-muted-foreground">Default: 2. Se suspende al exceder.</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="activationDate">Fecha de activación</Label>
                <Input
                  id="activationDate"
                  type="date"
                  {...register('activationDate')}
                  max={new Date().toISOString().split('T')[0]}
                  defaultValue={new Date().toISOString().split('T')[0]}
                />
                <p className="text-xs text-muted-foreground">
                  Fecha en que el cliente inició el servicio. Si es anterior a hoy, podrás agregar pagos históricos.
                </p>
                {errors.activationDate && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.activationDate.message}</p>
                )}
              </div>
            </div>

            {isRetroactive && (
              <div className="border-t pt-6">
                <div className="space-y-4 p-4 border rounded-lg bg-muted">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Pagos históricos (opcional)</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddHistoricalPayment}
                        className="gap-1"
                      >
                        <Plus className="h-3 w-3 shrink-0" />
                        Agregar
                      </Button>
                    </div>

                    {fields.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic">
                        Sin pagos históricos. Los períodos se generarán como pendientes/vencidos.
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {fields.map((field, index) => (
                          <div key={field.id} className="p-3 border rounded-lg bg-card space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-foreground">
                                Pago #{index + 1}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => remove(index)}
                                className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              >
                                <Trash2 className="h-3 w-3 shrink-0" />
                              </Button>
                            </div>

                            <div className="space-y-2">
                              <Label>Etiqueta del período</Label>
                              <Input
                                {...register(`historicalPayments.${index}.periodLabel`)}
                                placeholder="Ej: Enero - Febrero 2026"
                              />
                              {errors.historicalPayments?.[index]?.periodLabel && (
                                <p className="text-sm text-red-600 dark:text-red-400">
                                  {errors.historicalPayments[index].periodLabel?.message}
                                </p>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label>Fecha inicio</Label>
                                <Input
                                  type="date"
                                  {...register(`historicalPayments.${index}.startDate`)}
                                />
                                {errors.historicalPayments?.[index]?.startDate && (
                                  <p className="text-sm text-red-600 dark:text-red-400">
                                    {errors.historicalPayments[index].startDate?.message}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Fecha fin</Label>
                                <Input
                                  type="date"
                                  {...register(`historicalPayments.${index}.endDate`)}
                                />
                                {errors.historicalPayments?.[index]?.endDate && (
                                  <p className="text-sm text-red-600 dark:text-red-400">
                                    {errors.historicalPayments[index].endDate?.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <div className="space-y-2">
                                <Label>Monto</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  {...register(`historicalPayments.${index}.amount`)}
                                />
                                {errors.historicalPayments?.[index]?.amount && (
                                  <p className="text-sm text-red-600 dark:text-red-400">
                                    {errors.historicalPayments[index].amount?.message}
                                  </p>
                                )}
                              </div>
                              <div className="space-y-2">
                                <Label>Fecha de pago</Label>
                                <Input
                                  type="date"
                                  {...register(`historicalPayments.${index}.paidAt`)}
                                />
                                {errors.historicalPayments?.[index]?.paidAt && (
                                  <p className="text-sm text-red-600 dark:text-red-400">
                                    {errors.historicalPayments[index].paidAt?.message}
                                  </p>
                                )}
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label>Método de pago</Label>
                                <Select
                                  onValueChange={(value) => setValue(`historicalPayments.${index}.paymentMethod`, value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Seleccione método" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {Object.entries(PAYMENT_METHOD_LABELS)
                                      .filter(([key]) => key !== PaymentMethod.INITIAL_PAYMENT)
                                      .map(([key, label]) => (
                                        <SelectItem key={key} value={key}>
                                          {label}
                                        </SelectItem>
                                      ))}
                                  </SelectContent>
                                </Select>
                                {errors.historicalPayments?.[index]?.paymentMethod && (
                                  <p className="text-sm text-red-600 dark:text-red-400">
                                    {errors.historicalPayments[index].paymentMethod?.message}
                                  </p>
                                )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creando...' : 'Crear Suscripción'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to="/subscriptions">Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
