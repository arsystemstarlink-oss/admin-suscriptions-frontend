import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePlanDetail, useCreatePlan, useUpdatePlan } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Package, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { DetailNav } from '@/components/design-system/DetailNav'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { SuperAdminOrganizationField } from '@/components/organizations/SuperAdminOrganizationField'

const planSchema = z.object({
  organizationId: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  price: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
  description: z.string().optional(),
})

type PlanForm = z.infer<typeof planSchema>

const fieldClassName = 'h-12'

export function PlanFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const { data, isLoading } = usePlanDetail(id!)
  const createMutation = useCreatePlan()
  const updateMutation = useUpdatePlan()
  const [error, setError] = useState<string | null>(null)
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)

  const {
    register,
    control,
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

    if (!isEdit && isSuperAdmin && !formData.organizationId) {
      setError('Debe indicar la organización de destino.')
      return
    }

    try {
      const payload = {
        ...formData,
        ...(!isEdit && formData.organizationId ? { organizationId: formData.organizationId } : {}),
        description: formData.description || undefined,
      }

      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: payload,
          organizationId: data?.organizationId ?? organizationId ?? undefined,
        })
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
      <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-background -mx-4 px-4 pt-2">
        <div className="h-10 w-48 bg-muted animate-pulse rounded-xl mb-4" />
        <div className="h-64 bg-surface animate-pulse rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-background -mx-4 px-4 pt-2">
      <DetailNav
        backTo="/subscriptions/plans"
        className="mb-4"
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isEdit ? 'Editar Plan' : 'Nuevo Plan'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? 'Modificar información del plan' : 'Registrar un nuevo plan'}
            </p>
          </div>
        }
      />

      <form id="plan-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-surface text-surface-foreground rounded-2xl border border-border p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Package className="h-5 w-5 text-muted-foreground" />
            Información del Plan
          </h2>

          {!isEdit && (
            <SuperAdminOrganizationField control={control} error={errors.organizationId?.message} />
          )}

          <div className="space-y-2.5">
            <Label htmlFor="name" className="text-foreground">Nombre *</Label>
            <Input id="name" placeholder="Ej: Plan Residencial" className={fieldClassName} {...register('name')} />
            {errors.name && (
              <p className="text-sm text-destructive font-medium">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="price" className="text-foreground">Precio mensual *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground shrink-0" />
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
              <p className="text-sm text-destructive font-medium">{errors.price.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="description" className="text-foreground">
              Descripción <span className="text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <textarea
              id="description"
              rows={3}
              placeholder="Detalles del plan..."
              className="flex w-full min-h-[6rem] rounded-md border border-input bg-surface-muted px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('description')}
            />
          </div>
        </div>
      </form>

      <div className="fixed bottom-[var(--mobile-nav-h)] md:bottom-0 left-0 right-0 p-4 bg-surface/95 border-t border-border backdrop-blur-xl z-50">
        <Button
          type="submit"
          form="plan-form"
          className="w-full h-12 text-base font-semibold"
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
