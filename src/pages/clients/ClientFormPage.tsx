import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClientDetail, useCreateClient, useUpdateClient } from '@/hooks/useClients'
import { useFormDraft } from '@/hooks/useFormDraft'
import { useOrganizationStore } from '@/stores/organization.store'
import { useAuthStore, useIsSuperAdmin } from '@/stores/auth.store'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AlertTriangle, User, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { DetailNav } from '@/components/design-system/DetailNav'
import { FormSkeleton } from '@/components/design-system/Skeleton'
import { FormActionBar } from '@/components/design-system/FormActionBar'
import { UnsavedChangesGuard } from '@/components/design-system/UnsavedChangesGuard'
import { normalizeDni } from '@/lib/utils'
import { handleApiError } from '@/lib/error-handler'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'
import type { CreateClientRequest } from '@/types/api'
import { getNavigationStatePath } from '@/lib/navigation'

const clientSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z
    .string()
    .min(1, 'El teléfono es requerido')
    .regex(/^\+58\d{10,11}$/, 'Ingresa un teléfono venezolano válido (10-11 dígitos)'),
  dniPrefix: z.enum(['V-', 'J-']),
  dniDigits: z
    .string()
    .regex(/^\d{7,9}$/, 'La cédula requiere 7 a 9 dígitos numéricos')
    .optional()
    .or(z.literal('')),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type ClientForm = z.infer<typeof clientSchema>

const fieldClassName = 'h-12'

export function ClientFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isEdit = !!id
  const returnTo = getNavigationStatePath(location.state, 'returnTo') ?? '/subscriptions/clients'
  const isSuperAdmin = useIsSuperAdmin()
  const userId = useAuthStore((state) => state.user?.id)
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const { data, isLoading } = useClientDetail(id!, organizationId || undefined, {
    enabled: !isSuperAdmin || !!organizationId,
  })
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const [error, setFormError] = useState<string | null>(null)
  const backTo = isEdit ? `/subscriptions/clients/${id}` : '/subscriptions/clients'

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      dniPrefix: 'V-',
      dniDigits: '',
    },
  })
  const draft = useFormDraft({
    key: `ar-form-draft:${userId ?? 'unknown'}:client:new`,
    watch,
    reset,
    enabled: !isEdit && !!userId,
  })

  useEffect(() => {
    if (draft.restored) toast.info('Recuperamos el borrador del cliente')
  }, [draft.restored])

  useEffect(() => {
    if (isEdit && data) {
      const dni = data.client.dni ? normalizeDni(data.client.dni) : ''
      const dniMatch = /^([VJ])-(\d+)$/.exec(dni)
      const dniPrefix: 'V-' | 'J-' = dniMatch ? `${dniMatch[1]}-` as 'V-' | 'J-' : 'V-'
      reset({
        firstName: data.client.firstName,
        lastName: data.client.lastName,
        phone: data.client.phone,
        dniPrefix,
        dniDigits: dniMatch ? dniMatch[2] : '',
        email: data.client.email || '',
        address: data.client.address || '',
        notes: data.client.notes || '',
      })
    }
  }, [isEdit, data, reset])

  const onSubmit = async (formData: ClientForm) => {
    setFormError(null)

    if (!isEdit && !organizationId) {
      setFormError('Selecciona una organización para continuar.')
      return
    }

    try {
      const { dniPrefix, dniDigits, ...rest } = formData
      const payload = {
        ...rest,
        ...(!isEdit && organizationId ? { organizationId } : {}),
        dni: dniDigits ? `${dniPrefix}${dniDigits}` : isEdit ? null : undefined,
        email: rest.email || undefined,
        address: rest.address || undefined,
        notes: rest.notes || undefined,
      }

      if (isEdit && id) {
        await updateMutation.mutateAsync({
          id,
          data: payload,
          organizationId: data?.client.organizationId ?? organizationId ?? undefined,
        })
        toast.success('Cliente actualizado correctamente')
        draft.clearDraft()
        navigate(`/subscriptions/clients/${id}`, { replace: true, state: { from: returnTo } })
      } else {
        const newClient = await createMutation.mutateAsync(payload as CreateClientRequest)
        toast.success('Cliente creado correctamente')
        draft.clearDraft()
        navigate(`/subscriptions/clients/${newClient.id}`, {
          state: { from: returnTo },
        })
      }
    } catch (err) {
      handleApiError(err, {
        setFieldError: (message) => setError('dniDigits', { type: 'manual', message }),
      })
    }
  }

  if (isEdit && isLoading) {
    return (
      <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-background -mx-4 px-4 pt-2">
        <FormSkeleton label="Cargando cliente" />
      </div>
    )
  }

  if (!isEdit && isSuperAdmin && !organizationId) {
    return (
      <OrganizationSelectionEmptyState description="Elige una organización para registrar el cliente." />
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-background -mx-4 px-4 pt-2">
      <UnsavedChangesGuard isDirty={isDirty} isSubmitting={isSubmitting} />
      <DetailNav
        backTo={backTo}
        backState={isEdit ? { from: returnTo } : undefined}
        backLabel={isEdit ? 'Volver al cliente' : 'Volver a clientes'}
        className="mb-4"
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isEdit ? 'Editar cliente' : 'Nuevo cliente'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {isEdit ? 'Modificar información del cliente' : 'Registrar un nuevo cliente'}
            </p>
          </div>
        }
      />

      <form id="client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="new-password">
        {error && (
          <div className="p-4 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-xl flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <div className="bg-surface text-surface-foreground rounded-2xl border border-border p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Datos Personales
          </h2>

          <div className="space-y-2.5">
            <Label htmlFor="firstName" className="text-foreground">Nombre *</Label>
            <Input
              id="firstName"
              placeholder="Juan"
              data-1p-ignore
              data-lpignore="true"
              className={fieldClassName}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-sm text-destructive font-medium">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="lastName" className="text-foreground">Apellido *</Label>
            <Input
              id="lastName"
              placeholder="Pérez"
              data-1p-ignore
              data-lpignore="true"
              className={fieldClassName}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-sm text-destructive font-medium">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="phone" className="text-foreground">Teléfono *</Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  id="phone"
                  aria-invalid={!!errors.phone}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  className={fieldClassName}
                />
              )}
            />
            {errors.phone && (
              <p className="text-sm text-destructive font-medium">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="dniDigits" className="text-foreground">
              Cédula de Identidad (DNI) <span className="text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <div className="flex gap-2">
              <Controller
                name="dniPrefix"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="dniPrefix" className={`w-22 shrink-0 ${fieldClassName}`} aria-label="Tipo de cédula">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="V-">V-</SelectItem>
                      <SelectItem value="J-">J-</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <Controller
                name="dniDigits"
                control={control}
                render={({ field }) => (
                  <Input
                    id="dniDigits"
                    placeholder="2769383"
                    inputMode="numeric"
                    data-1p-ignore
                    data-lpignore="true"
                    className={`flex-1 min-w-0 ${fieldClassName}`}
                    value={field.value}
                    onChange={(e) => field.onChange(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    onBlur={field.onBlur}
                  />
                )}
              />
            </div>
            {errors.dniDigits && (
              <p className="text-sm text-destructive font-medium">{errors.dniDigits.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-foreground">
              Correo <span className="text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <Controller
              name="email"
              control={control}
              render={({ field }) => (
                <EmailInput
                  id="email"
                  aria-invalid={!!errors.email}
                  value={field.value}
                  onValueChange={field.onChange}
                  onBlur={field.onBlur}
                  className={fieldClassName}
                />
              )}
            />
            {errors.email && (
              <p className="text-sm text-destructive font-medium">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="bg-surface text-surface-foreground rounded-2xl border border-border p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <MapPin className="h-5 w-5 text-muted-foreground" />
            Información Adicional
          </h2>

          <div className="space-y-2.5">
            <Label htmlFor="address" className="text-foreground">
              Dirección <span className="text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <Input
              id="address"
              placeholder="Calle, número, ciudad"
              data-1p-ignore
              data-lpignore="true"
              className={fieldClassName}
              {...register('address')}
            />
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="notes" className="text-foreground">
              Notas <span className="text-muted-foreground font-normal">(Opcional)</span>
            </Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Notas adicionales sobre el cliente..."
              className="flex w-full min-h-24 rounded-md border border-input bg-surface-muted px-3 py-2 text-base md:text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('notes')}
            />
          </div>
        </div>
      </form>

      <FormActionBar
        formId="client-form"
        cancelTo={backTo}
        cancelState={isEdit ? { from: returnTo } : undefined}
        submitLabel={isEdit ? 'Actualizar cliente' : 'Crear cliente'}
        submittingLabel={isEdit ? 'Actualizando Cliente...' : 'Creando Cliente...'}
        isSubmitting={isSubmitting}
      />
    </div>
  )
}
