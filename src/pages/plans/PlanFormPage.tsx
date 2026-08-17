import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePlanDetail, useCreatePlan, useUpdatePlan } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Package, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { DetailNav } from '@/components/design-system/DetailNav'

const planSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  price: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
  description: z.string().optional(),
})

type PlanForm = z.infer<typeof planSchema>

const fieldClassName = 'h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700'

export function PlanFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const { data, isLoading } = usePlanDetail(id!)
  const createMutation = useCreatePlan()
  const updateMutation = useUpdatePlan()
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
  })

  useEffect(() => {
    if (isEdit && data) {
      reset({
        name: data.name,
        price: data.price,
        description: data.description || '',
      })
    }
  }, [isEdit, data, reset])

  const onSubmit = async (formData: PlanForm) => {
    setError(null)

    try {
      const payload = {
        ...formData,
        description: formData.description || undefined,
      }

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload })
        toast.success('Plan actualizado correctamente')
        navigate('/subscriptions/plans')
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Plan creado correctamente')
        navigate('/subscriptions/plans')
      }
    } catch {
      setError('Error al guardar el plan. Intente nuevamente.')
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-slate-50 dark:bg-primary-950 -mx-4 px-4 pt-2">
        <div className="h-10 w-48 bg-primary-100 dark:bg-primary-900 animate-pulse rounded-xl mb-4" />
        <div className="h-64 bg-white dark:bg-primary-900/50 animate-pulse rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-slate-50 dark:bg-primary-950 -mx-4 px-4 pt-2">
      <DetailNav
        backTo="/subscriptions/plans"
        className="mb-4"
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary-900 dark:text-primary-50">
              {isEdit ? 'Editar Plan' : 'Nuevo Plan'}
            </h1>
            <p className="text-sm text-primary-500 dark:text-primary-400">
              {isEdit ? 'Modificar información del plan' : 'Registrar un nuevo plan'}
            </p>
          </div>
        }
      />

      <form id="plan-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl dark:text-red-400 dark:bg-red-950/50 dark:border-red-900 flex items-start gap-3">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <Package className="h-5 w-5 text-primary-400" />
            Información del Plan
          </h2>

          <div className="space-y-2.5">
            <Label htmlFor="name" className="text-primary-800 dark:text-primary-200">Nombre *</Label>
            <Input id="name" placeholder="Ej: Plan Residencial" className={fieldClassName} {...register('name')} />
            {errors.name && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="price" className="text-primary-800 dark:text-primary-200">Precio mensual *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-primary-400 shrink-0" />
              <Input
                id="price"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0.00"
                className={`pl-10 ${fieldClassName}`}
                {...register('price')}
              />
            </div>
            {errors.price && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="description" className="text-primary-800 dark:text-primary-200">
              Descripción <span className="text-primary-400 font-normal">(Opcional)</span>
            </Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Detalles del plan..."
              className="flex w-full min-h-[6rem] rounded-md border border-primary-200 dark:border-primary-700 bg-slate-50 dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-primary-50 ring-offset-background placeholder:text-primary-400 dark:placeholder:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('description')}
            />
          </div>
        </div>
      </form>

      <div className="fixed bottom-0 left-0 right-0 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-white/90 dark:bg-primary-950/90 border-t border-primary-100 dark:border-primary-800 backdrop-blur-xl z-50">
        <Button
          type="submit"
          form="plan-form"
          className="w-full h-14 text-lg font-bold shadow-lg active:scale-95 transition-transform touch-manipulation bg-primary-800 hover:bg-primary-900 text-white dark:bg-primary-700"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? isEdit ? 'Actualizando Plan...' : 'Creando Plan...'
            : isEdit ? 'Actualizar Plan' : 'Crear Plan'}
        </Button>
      </div>
    </div>
  )
}
