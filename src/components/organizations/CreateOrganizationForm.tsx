import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateOrganization } from '@/hooks/useOrganizations'
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
import { MessageCircle } from 'lucide-react'
import { toast } from 'sonner'
import type { ApiError, OrganizationTwilioConfigRequest } from '@/types/api'

const createOrganizationSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  slug: z
    .string()
    .regex(/^[a-z0-9-]*$/, 'Solo minúsculas, números y guiones')
    .optional()
    .or(z.literal('')),
  twilioAccountSid: z.string().optional().or(z.literal('')),
  twilioAuthToken: z.string().optional().or(z.literal('')),
  twilioPhoneNumber: z
    .string()
    .refine(
      (value) => value === '' || /^\+?[1-9]\d{1,14}$/.test(value),
      'Número inválido. Use formato E.164, ej. +584223552626',
    )
    .optional(),
  twilioEnabled: z.enum(['true', 'false']),
})

type OrganizationForm = z.infer<typeof createOrganizationSchema>

type OrganizationField =
  | 'name'
  | 'slug'
  | 'twilioAccountSid'
  | 'twilioAuthToken'
  | 'twilioPhoneNumber'
  | 'twilioEnabled'

interface CreateOrganizationFormProps {
  onSuccess?: () => void
}

export function CreateOrganizationForm({ onSuccess }: CreateOrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createMutation = useCreateOrganization()

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<OrganizationForm>({
    resolver: zodResolver(createOrganizationSchema),
    defaultValues: {
      name: '',
      slug: '',
      twilioAccountSid: '',
      twilioAuthToken: '',
      twilioPhoneNumber: '',
      twilioEnabled: 'true',
    },
  })

  const onSubmit = async (data: OrganizationForm) => {
    setIsSubmitting(true)
    try {
      const twilioPayload: OrganizationTwilioConfigRequest = {
        accountSid: data.twilioAccountSid?.trim() || undefined,
        authToken: data.twilioAuthToken?.trim() || undefined,
        phoneNumber: data.twilioPhoneNumber?.trim() || undefined,
        enabled: data.twilioEnabled === 'true',
      }
      const hasTwilio =
        !!twilioPayload.accountSid || !!twilioPayload.authToken || !!twilioPayload.phoneNumber

      await createMutation.mutateAsync({
        name: data.name.trim(),
        slug: data.slug?.trim() || undefined,
        ...(hasTwilio ? { twilio: twilioPayload } : {}),
      })
      reset()
      onSuccess?.()
    } catch (err) {
      const apiError = err as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      if (handler?.type === 'field-error' && handler.field) {
        setError(handler.field as OrganizationField, {
          type: 'manual',
          message: handler.message,
        })
      } else {
        toast.error(handler?.message || apiError.message || 'Error al crear la organización')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="org-name">Nombre *</Label>
          <Input
            id="org-name"
            placeholder="Ej. Starlink Valencia"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-slug">Slug (opcional)</Label>
          <Input
            id="org-slug"
            placeholder="Ej. starlink-valencia"
            {...register('slug')}
          />
          {errors.slug && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.slug.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Identificador único. Si se deja vacío no se asigna.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary-600 dark:text-primary-300 shrink-0" />
          <h4 className="text-sm font-semibold text-foreground">WhatsApp (Twilio)</h4>
        </div>

        <p className="text-xs text-muted-foreground">
          Opcional. Sin credenciales propias, la organización usa la configuración global del
          servidor.
        </p>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <Label htmlFor="org-twilio-sid">Account SID</Label>
            <Input
              id="org-twilio-sid"
              placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              autoComplete="off"
              {...register('twilioAccountSid')}
            />
            {errors.twilioAccountSid && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.twilioAccountSid.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-twilio-token">Auth Token</Label>
            <Input
              id="org-twilio-token"
              type="password"
              autoComplete="new-password"
              placeholder="Auth Token de Twilio"
              {...register('twilioAuthToken')}
            />
            {errors.twilioAuthToken && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.twilioAuthToken.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-twilio-phone">Número de WhatsApp</Label>
            <Input
              id="org-twilio-phone"
              placeholder="+584223552626"
              autoComplete="off"
              {...register('twilioPhoneNumber')}
            />
            {errors.twilioPhoneNumber && (
              <p className="text-sm text-red-600 dark:text-red-400">
                {errors.twilioPhoneNumber.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="org-twilio-enabled">WhatsApp habilitado</Label>
            <Controller
              name="twilioEnabled"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="org-twilio-enabled">
                    <SelectValue placeholder="Selecciona una opción" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Habilitado</SelectItem>
                    <SelectItem value="false">Deshabilitado</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            <p className="text-xs text-muted-foreground">
              Sin credenciales propias, la organización usa la configuración global del servidor.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
          {isSubmitting || createMutation.isPending ? 'Creando...' : 'Crear organización'}
        </Button>
      </div>
    </form>
  )
}
