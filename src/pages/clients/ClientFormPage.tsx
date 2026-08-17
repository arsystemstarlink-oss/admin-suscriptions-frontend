import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useClientDetail, useCreateClient, useUpdateClient } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

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

export function ClientFormPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id
  const { data, isLoading } = useClientDetail(id!)
  const createMutation = useCreateClient()
  const updateMutation = useUpdateClient()
  const [error, setError] = useState<string | null>(null)

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
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-96 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={isEdit ? `/subscriptions/clients/${id}` : '/subscriptions/clients'}>
            <ArrowLeft className="h-5 w-5 shrink-0" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {isEdit ? 'Modificar información del cliente' : 'Registrar un nuevo cliente'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Información del Cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="new-password">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md dark:text-red-400 dark:bg-red-950 dark:border-red-800">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre *</Label>
                <Input id="firstName" placeholder="Juan" data-1p-ignore data-lpignore="true" {...register('firstName')} />
                {errors.firstName && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.firstName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido *</Label>
                <Input id="lastName" placeholder="Pérez" data-1p-ignore data-lpignore="true" {...register('lastName')} />
                {errors.lastName && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.lastName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono *</Label>
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
                    />
                  )}
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Correo</Label>
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
                    />
                  )}
                />
                {errors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="address">Dirección</Label>
                <Input id="address" placeholder="Calle, número, ciudad" data-1p-ignore data-lpignore="true" {...register('address')} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas</Label>
              <textarea
                id="notes"
                rows={3}
                placeholder="Notas adicionales sobre el cliente..."
                className="flex w-full rounded-md border border-input bg-card px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...register('notes')}
              />
            </div>

            <div className="flex items-center gap-3 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear'}
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link to={isEdit ? `/subscriptions/clients/${id}` : '/subscriptions/clients'}>Cancelar</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
