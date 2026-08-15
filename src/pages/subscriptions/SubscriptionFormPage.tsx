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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2, Box, CalendarDays, DollarSign, Clock, Users, Hash } from 'lucide-react'
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
    <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-slate-50 dark:bg-primary-950 -mx-4 px-4 pt-2">
      {/* Sticky Header Mobile */}
      <div className="sticky top-0 z-20 flex items-center gap-3 py-3 bg-slate-50/90 dark:bg-primary-950/90 backdrop-blur-md mb-4 -mx-4 px-4">
        <Link 
          to="/subscriptions" 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 text-primary-600 dark:text-primary-300 shadow-sm active:scale-95 transition-transform touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
        </Link>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-primary-900 dark:text-primary-50">Nueva Suscripción</h1>
          <p className="text-sm text-primary-500 dark:text-primary-400">Asociar cliente a plan</p>
        </div>
      </div>

      <form id="subscription-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl dark:text-red-400 dark:bg-red-950/50 dark:border-red-900 flex items-start gap-3">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Bloque 1: Cliente y Plan */}
        <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <Users className="h-5 w-5 text-primary-400" />
            Datos Principales
          </h2>
          
          <div className="space-y-2.5">
            <Label className="text-primary-800 dark:text-primary-200">Cliente *</Label>
            <Select onValueChange={(value) => setValue('clientId', value)}>
              <SelectTrigger className="h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700">
                <SelectValue placeholder="Seleccione un cliente" />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id} className="py-3">
                    {getClientFullName(client)} — {client.phone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.clientId && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.clientId.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label className="text-primary-800 dark:text-primary-200">Plan *</Label>
            <Select onValueChange={(value) => setValue('planId', value)}>
              <SelectTrigger className="h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700">
                <SelectValue placeholder="Seleccione un plan" />
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
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.planId.message}</p>
            )}
          </div>
        </div>

        {/* Bloque 2: Equipo y Cuenta */}
        <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <Box className="h-5 w-5 text-primary-400" />
            Datos del Equipo
          </h2>

          <div className="space-y-2.5">
            <Label htmlFor="kitNumber" className="text-primary-800 dark:text-primary-200">Número de Kit *</Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400 shrink-0" />
              <Input 
                id="kitNumber" 
                {...register('kitNumber')} 
                placeholder="Ej: KIT-001" 
                className="pl-10 h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700" 
                inputMode="text"
              />
            </div>
            {errors.kitNumber && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.kitNumber.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="accountNumber" className="text-primary-800 dark:text-primary-200">Cuenta Starlink <span className="text-primary-400 font-normal">(Opcional)</span></Label>
            <div className="relative">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400 shrink-0" />
              <Input 
                id="accountNumber" 
                {...register('accountNumber')} 
                placeholder="Ej: ACC-8381534..." 
                className="pl-10 h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700" 
              />
            </div>
          </div>
        </div>

        {/* Bloque 3: Facturación */}
        <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-primary-400" />
            Reglas de Facturación
          </h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <Label htmlFor="billingDay" className="text-primary-800 dark:text-primary-200">Día de Corte *</Label>
              <Input 
                id="billingDay" 
                type="number" 
                inputMode="numeric"
                min={1} 
                max={28} 
                {...register('billingDay')} 
                className="h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-center font-bold text-lg" 
              />
              {errors.billingDay && (
                <p className="text-sm text-red-600 dark:text-red-400 font-medium text-center">{errors.billingDay.message}</p>
              )}
            </div>

            <div className="space-y-2.5">
              <Label htmlFor="maxOverduePeriods" className="text-primary-800 dark:text-primary-200">Límite Vencidos</Label>
              <Input
                id="maxOverduePeriods"
                type="number"
                inputMode="numeric"
                min={1}
                max={12}
                {...register('maxOverduePeriods')}
                className="h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-center font-bold text-lg" 
              />
            </div>
          </div>
          <p className="text-xs text-primary-500 dark:text-primary-400 text-center mt-1">Si se excede el límite de vencidos, la suscripción se suspende automáticamente.</p>

          <div className="pt-2">
            <Label htmlFor="activationDate" className="text-primary-800 dark:text-primary-200">Fecha de Activación</Label>
            <Input
              id="activationDate"
              type="date"
              {...register('activationDate')}
              max={new Date().toISOString().split('T')[0]}
              defaultValue={new Date().toISOString().split('T')[0]}
              className="mt-2.5 h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700" 
            />
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-2">
              Si la fecha es anterior a hoy, podrás agregar pagos históricos.
            </p>
          </div>
        </div>

        {/* Bloque 4: Retroactivo */}
        {isRetroactive && (
          <div className="bg-secondary-50/50 dark:bg-secondary-900/10 rounded-2xl border border-secondary-200 dark:border-secondary-800/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
                <Clock className="h-5 w-5 text-secondary-600 dark:text-secondary-400" />
                Pagos Históricos
              </h2>
              <button
                type="button"
                onClick={handleAddHistoricalPayment}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-100 text-secondary-800 dark:bg-secondary-800/50 dark:text-secondary-300 rounded-lg text-sm font-semibold active:scale-95 transition-transform"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Añadir
              </button>
            </div>

            {fields.length === 0 ? (
              <p className="text-sm text-primary-600 dark:text-primary-400 bg-white/50 dark:bg-primary-950/30 p-3 rounded-lg border border-primary-100/50 dark:border-primary-800/30 italic text-center">
                Sin pagos históricos. Los períodos anteriores se generarán como pendientes.
              </p>
            ) : (
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="p-4 bg-white dark:bg-primary-900 border border-primary-200 dark:border-primary-800 rounded-xl space-y-4 shadow-sm relative">
                    
                    <div className="flex justify-between items-center border-b border-primary-100 dark:border-primary-800 pb-2">
                      <span className="font-semibold text-primary-800 dark:text-primary-200">
                        Pago #{index + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        className="p-1.5 text-red-500 bg-red-50 rounded-md active:bg-red-100 dark:bg-red-900/30 dark:text-red-400 touch-manipulation"
                      >
                        <Trash2 className="h-4 w-4 shrink-0" />
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary-600 dark:text-primary-400">PERÍODO</Label>
                      <Input
                        {...register(`historicalPayments.${index}.periodLabel`)}
                        placeholder="Ej: Enero 2026"
                        className="h-10 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-primary-600 dark:text-primary-400">DESDE</Label>
                        <Input type="date" {...register(`historicalPayments.${index}.startDate`)} className="h-10 text-sm" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-primary-600 dark:text-primary-400">HASTA</Label>
                        <Input type="date" {...register(`historicalPayments.${index}.endDate`)} className="h-10 text-sm" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-primary-600 dark:text-primary-400">MONTO</Label>
                        <div className="relative">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-primary-400 shrink-0" />
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
                        <Label className="text-xs font-semibold text-primary-600 dark:text-primary-400">PAGADO EL</Label>
                        <Input type="date" {...register(`historicalPayments.${index}.paidAt`)} className="h-10 text-sm" />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-primary-600 dark:text-primary-400">MÉTODO</Label>
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
      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/90 dark:bg-primary-950/90 border-t border-primary-100 dark:border-primary-800 backdrop-blur-xl z-50">
        <Button 
          type="submit" 
          form="subscription-form"
          className="w-full h-14 text-lg font-bold shadow-lg active:scale-95 transition-transform touch-manipulation bg-primary-800 hover:bg-primary-900 text-white dark:bg-primary-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creando Suscripción...' : 'Crear Suscripción'}
        </Button>
      </div>
    </div>
  )
}
