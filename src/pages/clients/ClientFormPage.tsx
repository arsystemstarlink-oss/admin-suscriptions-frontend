import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClientDetail, useCreateClient, useUpdateClient } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
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
import { User, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { DetailNav } from '@/components/design-system/DetailNav'
import { normalizeDni } from '@/lib/utils'
import { handleApiError } from '@/lib/error-handler'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { SuperAdminOrganizationField } from '@/components/organizations/SuperAdminOrganizationField'
import type { CreateClientRequest } from '@/types/api'

const clientSchema = z.object({
  organizationId: z.string().optional(),
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z
    .string()
    .min(1, 'El teléfono es requerido')
    .regex(/^\+58\d{10,11}$/, 'Ingrese un teléfono venezolano válido (10-11 dígitos)'),
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
  const isEdit = !!id
  const { data, isLoading } = useClientDetail(id!)
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const [error, setFormError] = useState<string | null>(null)
  const backTo = isEdit ? `/subscriptions/clients/${id}` : '/subscriptions/clients'
  const isSuperAdmin = useIsSuperAdmin()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      dniPrefix: 'V-',
      dniDigits: '',
    },
  })

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

    if (!isEdit && isSuperAdmin && !formData.organizationId) {
      setFormError('Debe indicar la organización de destino.')
      return
    }

    try {
      const { dniPrefix, dniDigits, organizationId, ...rest } = formData
      const payload = {
        ...rest,
        ...(!isEdit && organizationId ? { organizationId } : {}),
        dni: dniDigits ? `${dniPrefix}${dniDigits}` : isEdit ? null : undefined,
        email: rest.email || undefined,
        address: rest.address || undefined,
        notes: rest.notes || undefined,
      }

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload })
        toast.success('Cliente actualizado correctamente')
        navigate(`/subscriptions/clients/${id}`)
      } else {
        const newClient = await createMutation.mutateAsync(payload as CreateClientRequest)
        toast.success('Cliente creado correctamente')
        navigate(`/subscriptions/clients/${newClient.id}`)
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
        <div className="h-10 w-48 bg-muted animate-pulse rounded-xl mb-4" />
        <div className="h-64 bg-surface animate-pulse rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-full pb-[calc(100px+env(safe-area-inset-bottom))] bg-background -mx-4 px-4 pt-2">
      <DetailNav
        backTo={backTo}
        className="mb-4"
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
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
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-surface text-surface-foreground rounded-2xl border border-border p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" />
            Datos Personales
          </h2>

          {!isEdit && (
            <SuperAdminOrganizationField control={control} error={errors.organizationId?.message} />
          )}

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
                    <SelectTrigger id="dniPrefix" className={`w-[88px] shrink-0 ${fieldClassName}`} aria-label="Tipo de cédula">
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
              className="flex w-full min-h-[6rem] rounded-md border border-input bg-surface-muted px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('notes')}
            />
          </div>
        </div>
      </form>

      <div className="fixed bottom-[var(--mobile-nav-h)] md:bottom-0 left-0 right-0 p-4 bg-surface/95 border-t border-border backdrop-blur-xl z-50">
        <Button
          type="submit"
          form="client-form"
          className="w-full h-12 text-base font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? isEdit ? 'Actualizando Cliente...' : 'Creando Cliente...'
            : isEdit ? 'Actualizar Cliente' : 'Crear Cliente'}
        </Button>
      </div>
    </div>
  )
}
