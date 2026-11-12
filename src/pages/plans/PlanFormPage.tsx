import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { usePlanDetail, useCreatePlan, useUpdatePlan } from '@/hooks/usePlans'
import { useFormDraft } from '@/hooks/useFormDraft'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertTriangle, Package, DollarSign } from 'lucide-react'
import { toast } from 'sonner'
import { DetailNav } from '@/components/design-system/DetailNav'
import { FormSkeleton } from '@/components/design-system/Skeleton'
import { FormActionBar } from '@/components/design-system/FormActionBar'
import { UnsavedChangesGuard } from '@/components/design-system/UnsavedChangesGuard'
import { useAuthStore, useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'
import { getNavigationStatePath } from '@/lib/navigation'

const planSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  price: z.coerce.number().min(0.01, 'El precio debe ser mayor a 0'),
  description: z.string().optional(),
})

type PlanForm = z.infer<typeof planSchema>

const fieldClassName = 'h-12'

export function PlanFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = !!id
  const returnTo = getNavigationStatePath(location.state, 'returnTo') ?? '/subscriptions/plans'
  const { data, isLoading } = usePlanDetail(id!)
  const createMutation = useCreatePlan()
  const updateMutation = useUpdatePlan()
  const [error, setError] = useState<string | null>(null)
  const isSuperAdmin = useIsSuperAdmin()
  const userId = useAuthStore((state) => state.user?.id)
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<PlanForm>({
    resolver: zodResolver(planSchema),
  })
  const draft = useFormDraft({
    key: `ar-form-draft:${userId ?? 'unknown'}:plan:new`,
    watch,
    reset,
    enabled: !isEdit && !!userId,
  })

  useEffect(() => {
    if (draft.restored) toast.info('Recuperamos el borrador del plan')
  }, [draft.restored])

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

    if (!isEdit && !organizationId) {
      setError('Selecciona una organización para continuar.')
      return
    }

    try {
      const payload = {
        ...formData,
        ...(!isEdit && organizationId ? { organizationId } : {}),
        description: formData.description || undefined,
      }

      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: payload,
          organizationId: data?.organizationId ?? organizationId ?? undefined,
        })
        toast.success('Plan actualizado correctamente')
        draft.clearDraft()
        navigate(returnTo, { replace: true })
      } else {
        await createMutation.mutateAsync(payload)
        toast.success('Plan creado correctamente')
        draft.clearDraft()
        navigate(returnTo, { replace: true })
      }
    } catch {
      setError('Error al guardar el plan. Inténtalo de nuevo.')
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-background -mx-4 px-4 pt-2">
        <FormSkeleton label="Cargando plan" />
      </div>
    )
  }

  if (!isEdit && isSuperAdmin && !organizationId) {
    return (
      <OrganizationSelectionEmptyState description="Elige una organización para crear el plan." />
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-background -mx-4 px-4 pt-2">
      <UnsavedChangesGuard isDirty={isDirty} isSubmitting={isSubmitting} />
      <DetailNav
        backLabel="Volver a planes"
        backTo={returnTo}
        className="mb-4"
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isEdit ? 'Editar plan' : 'Nuevo plan'}
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
              className="flex w-full min-h-24 rounded-md border border-input bg-surface-muted px-3 py-2 text-base md:text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('description')}
            />
          </div>
        </div>
      </form>

      <FormActionBar
        formId="plan-form"
        cancelTo={returnTo}
        submitLabel={isEdit ? 'Actualizar plan' : 'Crear plan'}
        submittingLabel={isEdit ? 'Actualizando Plan...' : 'Creando Plan...'}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
