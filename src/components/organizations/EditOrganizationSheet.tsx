import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  BUSINESS_PLANS,
  CUSTOM_PLAN_MIN_CLIENTS,
  ORGANIZATION_PLAN_STATUS_LABELS,
} from '@/lib/constants'
import { useUpdateOrganization, useDeleteOrganization } from '@/hooks/useOrganizations'
import { OrganizationWhatsAppSettings } from '@/components/organizations/OrganizationWhatsAppSettings'
import { getErrorHandler } from '@/lib/error-handler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
import { AlertTriangle, Building2 } from 'lucide-react'
import { toast } from 'sonner'
import type {
  ApiError,
  BusinessPlanKey,
  Organization,
  OrganizationPlanStatus,
} from '@/types/api'

const editOrganizationSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Solo minúsculas, números y guiones')
    .optional()
    .or(z.literal('')),
  active: z.enum(['true', 'false']),
  plan: z.enum(['basico', 'pro', 'negocio', 'a-medida']),
  clientLimit: z.coerce.number().int().min(1, 'El límite debe ser mayor que cero'),
  planStatus: z.enum(['prueba', 'activo', 'vencido', 'suspendido']),
  trialEndsAt: z.string(),
  planExpiresAt: z.string(),
}).superRefine((data, context) => {
  if (data.plan === 'a-medida' && data.clientLimit < CUSTOM_PLAN_MIN_CLIENTS) {
    context.addIssue({
      code: 'custom',
      path: ['clientLimit'],
      message: `El plan A medida debe permitir al menos ${CUSTOM_PLAN_MIN_CLIENTS} clientes`,
    })
  }
  if (data.planStatus === 'prueba' && data.plan !== 'basico') {
    context.addIssue({
      code: 'custom',
      path: ['planStatus'],
      message: 'La prueba gratis solo está disponible en el plan Básico',
    })
  }
  if (data.planStatus === 'prueba' && !data.trialEndsAt) {
    context.addIssue({
      code: 'custom',
      path: ['trialEndsAt'],
      message: 'Indica cuándo termina la prueba',
    })
  }
  if (data.planStatus === 'activo' && !data.planExpiresAt) {
    context.addIssue({
      code: 'custom',
      path: ['planExpiresAt'],
      message: 'Indica cuándo vence el plan',
    })
  }
})

type EditOrganizationForm = z.infer<typeof editOrganizationSchema>

interface EditOrganizationSheetProps {
  organization: Organization
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditOrganizationSheet({ organization, open, onOpenChange }: EditOrganizationSheetProps) {
  const updateMutation = useUpdateOrganization()
  const deleteMutation = useDeleteOrganization()
  const [error, setError] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError: setFormError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<EditOrganizationForm>({
    resolver: zodResolver(editOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      active: 'true',
      plan: 'basico',
      clientLimit: 30,
      planStatus: 'activo',
      trialEndsAt: '',
      planExpiresAt: '',
    },
  })
  const selectedPlan = watch('plan')

  useEffect(() => {
    if (open && organization) {
      reset({
        name: organization.name,
        slug: organization.slug || '',
        active: organization.active ? 'true' : 'false',
        plan: organization.plan ?? 'basico',
        clientLimit:
          organization.clientLimit ??
          (organization.plan
            ? BUSINESS_PLANS[organization.plan].clientLimit ?? CUSTOM_PLAN_MIN_CLIENTS
            : BUSINESS_PLANS.basico.clientLimit),
        planStatus: organization.planStatus ?? 'activo',
        trialEndsAt: organization.trialEndsAt?.slice(0, 10) ?? '',
        planExpiresAt: organization.planExpiresAt?.slice(0, 10) ?? '',
      })
      setError(null)
      setShowDeleteConfirm(false)
    }
  }, [open, organization, reset])

  const onSubmit = async (data: EditOrganizationForm) => {
    setError(null)
    if (organization.clientCount !== undefined && data.clientLimit < organization.clientCount) {
      const message = `El límite no puede ser menor que los ${organization.clientCount} clientes actuales.`
      setFormError('clientLimit', { type: 'manual', message })
      return
    }
    try {
      await updateMutation.mutateAsync({
        id: organization.id,
        data: {
          name: data.name.trim(),
          slug: data.slug?.trim() || undefined,
          active: data.active === 'true',
          plan: data.plan,
          clientLimit: data.clientLimit,
          planStatus: data.planStatus,
          trialEndsAt: data.trialEndsAt
            ? new Date(`${data.trialEndsAt}T23:59:59.999Z`).toISOString()
            : null,
          planExpiresAt: data.planExpiresAt
            ? new Date(`${data.planExpiresAt}T23:59:59.999Z`).toISOString()
            : null,
        },
      })
      onOpenChange(false)
    } catch (err) {
      const apiError = err as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      if (handler?.type === 'field-error' && handler.field) {
        setFormError(handler.field as 'name' | 'slug' | 'clientLimit' | 'planStatus', {
          type: 'manual',
          message: handler.message,
        })
      } else {
        const message = handler?.message || apiError.message || 'Error al actualizar la organización'
        toast.error(message)
        setError(message)
      }
    }
  }

  const handleDelete = async () => {
    setError(null)
    try {
      await deleteMutation.mutateAsync(organization.id)
      setShowDeleteConfirm(false)
      onOpenChange(false)
    } catch (err) {
      const apiError = err as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      const message = handler?.message || apiError.message || 'Error al eliminar la organización'
      toast.error(message)
      setError(message)
      setShowDeleteConfirm(false)
    }
  }

  if (!organization) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl">
        <SheetHeader>
          <div className="flex items-center gap-3 pr-8">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary shrink-0" />
            </div>
            <div>
              <SheetTitle>Editar Organización</SheetTitle>
              <SheetDescription>
                Modifica los datos de {organization.name}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex flex-1 flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-6 pt-4 space-y-4">
            {error && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                {error}
              </div>
            )}

            <form id="edit-organization-form" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-org-name">Nombre *</Label>
                <Input
                  id="edit-org-name"
                  placeholder="Nombre de la organización"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org-slug">Slug</Label>
                <Input
                  id="edit-org-slug"
                  placeholder="Ej. starlink-valencia"
                  {...register('slug')}
                />
                {errors.slug && (
                  <p className="text-sm text-destructive">{errors.slug.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org-active">Estado *</Label>
                <Controller
                  name="active"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="edit-org-active">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Activa</SelectItem>
                        <SelectItem value="false">Inactiva</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
                <p className="text-xs text-muted-foreground">
                  Las organizaciones inactivas no pueden recibir nuevos administradores.
                </p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="edit-org-plan">Plan</Label>
                <Controller
                  name="plan"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value: BusinessPlanKey) => {
                        field.onChange(value)
                        const limit = BUSINESS_PLANS[value].clientLimit
                        setValue(
                          'clientLimit',
                          limit ?? Math.max(CUSTOM_PLAN_MIN_CLIENTS, organization.clientCount ?? 0),
                        )
                      }}
                    >
                      <SelectTrigger id="edit-org-plan">
                        <SelectValue placeholder="Selecciona un plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(BUSINESS_PLANS).map(([key, plan]) => (
                          <SelectItem key={key} value={key}>
                            {plan.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org-client-limit">Límite de clientes</Label>
                <Input
                  id="edit-org-client-limit"
                  type="number"
                  min={1}
                  step={1}
                  readOnly={selectedPlan !== 'a-medida'}
                  {...register('clientLimit', { valueAsNumber: true })}
                />
                <p className="text-xs text-muted-foreground">
                  {selectedPlan === 'a-medida'
                    ? `Elige un límite de al menos ${CUSTOM_PLAN_MIN_CLIENTS} clientes.`
                    : 'El límite se define según el plan elegido.'}
                </p>
                {errors.clientLimit && (
                  <p className="text-sm text-destructive">{errors.clientLimit.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org-plan-status">Estado del plan</Label>
                <Controller
                  name="planStatus"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(value: OrganizationPlanStatus) => field.onChange(value)}
                    >
                      <SelectTrigger id="edit-org-plan-status">
                        <SelectValue placeholder="Selecciona un estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(ORGANIZATION_PLAN_STATUS_LABELS).map(([key, label]) => (
                          <SelectItem
                            key={key}
                            value={key}
                            disabled={key === 'prueba' && selectedPlan !== 'basico'}
                          >
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.planStatus && (
                  <p className="text-sm text-destructive">{errors.planStatus.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org-trial-ends">Fin de prueba</Label>
                <Input id="edit-org-trial-ends" type="date" {...register('trialEndsAt')} />
                {errors.trialEndsAt && (
                  <p className="text-sm text-destructive">{errors.trialEndsAt.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-org-plan-expires">Vencimiento del plan</Label>
                <Input id="edit-org-plan-expires" type="date" {...register('planExpiresAt')} />
                {errors.planExpiresAt && (
                  <p className="text-sm text-destructive">{errors.planExpiresAt.message}</p>
                )}
              </div>
            </div>
            </form>

            <Separator />

            <OrganizationWhatsAppSettings
              organizationId={organization.id}
              organizationName={organization.name}
            />

            {showDeleteConfirm && (
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/10 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">
                    Se eliminará {organization.name} y todos sus datos: administradores, clientes,
                    planes, suscripciones y períodos de facturación. Esta acción no se puede deshacer.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    {deleteMutation.isPending ? 'Eliminando...' : 'Confirmar eliminación'}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>

          <SheetFooter className="flex-row justify-between gap-2">
            <Button
              type="button"
              variant="destructive"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleteMutation.isPending}
            >
              Eliminar
            </Button>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form="edit-organization-form"
                disabled={isSubmitting || updateMutation.isPending}
              >
                {isSubmitting || updateMutation.isPending ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </SheetFooter>
        </div>
      </SheetContent>
    </Sheet>
  )
}
