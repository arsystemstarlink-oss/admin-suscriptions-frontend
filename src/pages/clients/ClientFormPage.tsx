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
import { User, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import { DetailNav } from '@/components/design-system/DetailNav'

const clientSchema = z.object({
  firstName: z.string().min(1, 'El nombre es requerido'),
  lastName: z.string().min(1, 'El apellido es requerido'),
  phone: z
    .string()
    .min(1, 'El teléfono es requerido')
    .regex(/^\+58\d{10,11}$/, 'Ingrese un teléfono venezolano válido (10-11 dígitos)'),
  email: z.string().email('Correo inválido').optional().or(z.literal('')),
  address: z.string().optional(),
  notes: z.string().optional(),
})

type ClientForm = z.infer<typeof clientSchema>

const fieldClassName = 'h-12 bg-slate-50 dark:bg-primary-900 border-primary-200 dark:border-primary-700'

export function ClientFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const { data, isLoading } = useClientDetail(id!)
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const [error, setError] = useState<string | null>(null)
  const backTo = isEdit ? `/subscriptions/clients/${id}` : '/subscriptions/clients'

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ClientForm>({
    resolver: zodResolver(clientSchema),
  })

  useEffect(() => {
    if (isEdit && data) {
      reset({
        firstName: data.client.firstName,
        lastName: data.client.lastName,
        phone: data.client.phone,
        email: data.client.email || '',
        address: data.client.address || '',
        notes: data.client.notes || '',
      })
    }
  }, [isEdit, data, reset])

  const onSubmit = async (formData: ClientForm) => {
    setError(null)

    try {
      const payload = {
        ...formData,
        email: formData.email || undefined,
        address: formData.address || undefined,
        notes: formData.notes || undefined,
      }

      if (isEdit && id) {
        await updateMutation.mutateAsync({ id, data: payload })
        toast.success('Cliente actualizado correctamente')
        navigate(`/subscriptions/clients/${id}`)
      } else {
        const newClient = await createMutation.mutateAsync(payload)
        toast.success('Cliente creado correctamente')
        navigate(`/subscriptions/clients/${newClient.id}`)
      }
    } catch {
      setError('Error al guardar el cliente. Intente nuevamente.')
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
        backTo={backTo}
        className="mb-4"
        title={
          <div>
            <h1 className="text-xl font-bold tracking-tight text-primary-900 dark:text-primary-50">
              {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
            </h1>
            <p className="text-sm text-primary-500 dark:text-primary-400">
              {isEdit ? 'Modificar información del cliente' : 'Registrar un nuevo cliente'}
            </p>
          </div>
        }
      />

      <form id="client-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6" autoComplete="new-password">
        {error && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl dark:text-red-400 dark:bg-red-950/50 dark:border-red-900 flex items-start gap-3">
            <span className="shrink-0 mt-0.5">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <User className="h-5 w-5 text-primary-400" />
            Datos Personales
          </h2>

          <div className="space-y-2.5">
            <Label htmlFor="firstName" className="text-primary-800 dark:text-primary-200">Nombre *</Label>
            <Input
              id="firstName"
              placeholder="Juan"
              data-1p-ignore
              data-lpignore="true"
              className={fieldClassName}
              {...register('firstName')}
            />
            {errors.firstName && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.firstName.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="lastName" className="text-primary-800 dark:text-primary-200">Apellido *</Label>
            <Input
              id="lastName"
              placeholder="Pérez"
              data-1p-ignore
              data-lpignore="true"
              className={fieldClassName}
              {...register('lastName')}
            />
            {errors.lastName && (
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.lastName.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="phone" className="text-primary-800 dark:text-primary-200">Teléfono *</Label>
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
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2.5">
            <Label htmlFor="email" className="text-primary-800 dark:text-primary-200">
              Correo <span className="text-primary-400 font-normal">(Opcional)</span>
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
              <p className="text-sm text-red-600 dark:text-red-400 font-medium">{errors.email.message}</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-primary-900/50 rounded-2xl border border-primary-100 dark:border-primary-800 p-4 space-y-5 shadow-sm">
          <h2 className="text-base font-semibold text-primary-900 dark:text-primary-100 flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary-400" />
            Información Adicional
          </h2>

          <div className="space-y-2.5">
            <Label htmlFor="address" className="text-primary-800 dark:text-primary-200">
              Dirección <span className="text-primary-400 font-normal">(Opcional)</span>
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
            <Label htmlFor="notes" className="text-primary-800 dark:text-primary-200">
              Notas <span className="text-primary-400 font-normal">(Opcional)</span>
            </Label>
            <textarea
              id="notes"
              rows={3}
              placeholder="Notas adicionales sobre el cliente..."
              className="flex w-full min-h-[6rem] rounded-md border border-primary-200 dark:border-primary-700 bg-slate-50 dark:bg-primary-900 px-3 py-2 text-sm text-primary-900 dark:text-primary-50 ring-offset-background placeholder:text-primary-400 dark:placeholder:text-primary-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              {...register('notes')}
            />
          </div>
        </div>
      </form>

      <div className="fixed bottom-[var(--mobile-nav-h)] md:bottom-0 left-0 right-0 p-4 bg-white/90 dark:bg-primary-950/90 border-t border-primary-100 dark:border-primary-800 backdrop-blur-xl z-50">
        <Button
          type="submit"
          form="client-form"
          className="w-full h-12 text-base font-semibold active:scale-95 transition-transform touch-manipulation bg-primary-800 hover:bg-primary-900 text-white dark:bg-primary-700"
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
