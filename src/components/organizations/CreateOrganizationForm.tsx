import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOnboardOrganization } from '@/hooks/useOrganizations'
import { useBusinessPlans } from '@/hooks/useOrganizationPlanPaymentReports'
import { getErrorHandler } from '@/lib/error-handler'
import { getCatalogItem } from '@/lib/business-plan-catalog'
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
  adminName: z.string().min(1, 'El nombre del administrador es requerido'),
  adminEmail: z.string().min(1, 'El correo es requerido').email('Correo inválido'),
  initialPassword: z
    .string()
    .min(8, 'Usa al menos 8 caracteres')
    .regex(/[a-zA-Z]/, 'La contraseña debe incluir letras')
    .regex(/\d/, 'La contraseña debe incluir números'),
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
  | 'adminName'
  | 'adminEmail'
  | 'initialPassword'
  | 'twilioAccountSid'
  | 'twilioAuthToken'
  | 'twilioPhoneNumber'
  | 'twilioEnabled'

const ORGANIZATION_ERROR_FIELDS: Record<string, OrganizationField> = {
  name: 'name',
  slug: 'slug',
  email: 'adminEmail',
  adminName: 'adminName',
  adminEmail: 'adminEmail',
  password: 'initialPassword',
  newPassword: 'initialPassword',
  adminPassword: 'initialPassword',
  initialPassword: 'initialPassword',
  twilioAccountSid: 'twilioAccountSid',
  twilioAuthToken: 'twilioAuthToken',
  twilioPhoneNumber: 'twilioPhoneNumber',
  twilioEnabled: 'twilioEnabled',
}

interface CreateOrganizationFormProps {
  onSuccess?: () => void
}

export function CreateOrganizationForm({ onSuccess }: CreateOrganizationFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [createdCredentials, setCreatedCredentials] = useState<{
    organizationName: string
    email: string
    password: string
  } | null>(null)
  const createMutation = useOnboardOrganization()
  const { data: catalogData } = useBusinessPlans()
  const basicPlan = getCatalogItem(catalogData?.plans, 'basico')

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
      adminName: '',
      adminEmail: '',
      initialPassword: '',
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

      const response = await createMutation.mutateAsync({
        organization: {
          name: data.name.trim(),
          slug: data.slug?.trim() || undefined,
          ...(hasTwilio ? { twilio: twilioPayload } : {}),
        },
        admin: {
          name: data.adminName.trim(),
          email: data.adminEmail.trim(),
          password: data.initialPassword,
        },
      })
      setCreatedCredentials({
        organizationName: response.organization.name,
        email: response.admin.email,
        password: data.initialPassword,
      })
    } catch (err) {
      const apiError = err as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      if (handler?.type === 'field-error' && handler.field) {
        const field = ORGANIZATION_ERROR_FIELDS[handler.field]
        if (field) {
          setError(field, {
            type: 'manual',
            message: handler.message,
          })
        } else {
          toast.error(handler.message)
        }
      } else {
        toast.error(handler?.message || apiError.message || 'Error al crear la organización')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (createdCredentials) {
    const credentialText =
      `Organización: ${createdCredentials.organizationName}\n` +
      `Correo: ${createdCredentials.email}\n` +
      `Contraseña inicial: ${createdCredentials.password}`

    const copyCredentials = async () => {
      try {
        await navigator.clipboard.writeText(credentialText)
        toast.success('Credenciales copiadas')
      } catch {
        window.prompt('Copia estas credenciales y envíaselas al cliente:', credentialText)
      }
    }

    return (
      <section className="space-y-4" aria-labelledby="organization-created-title">
        <div className="rounded-xl border border-success/20 bg-success/10 p-4">
          <h3 id="organization-created-title" className="font-semibold">
            Organización y administrador creados
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            La organización quedó con el plan Básico y {basicPlan?.trialDays ?? '—'} días de prueba.
          </p>
        </div>
        <div className="space-y-3 rounded-xl border border-border bg-surface p-4">
          <p className="font-medium">Credenciales para enviar</p>
          <div>
            <p className="text-sm text-muted-foreground">Organización</p>
            <p className="font-medium">{createdCredentials.organizationName}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Correo</p>
            <p className="break-all font-medium">{createdCredentials.email}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="created-admin-password">Contraseña inicial</Label>
            <Input
              id="created-admin-password"
              type="text"
              readOnly
              autoComplete="off"
              value={createdCredentials.password}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Copia la contraseña ahora. No se guardará en la aplicación después de cerrar esta ventana.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => void copyCredentials()}>
            Copiar credenciales
          </Button>
          <Button
            type="button"
            onClick={() => {
              setCreatedCredentials(null)
              reset()
              onSuccess?.()
            }}
          >
            Cerrar y limpiar
          </Button>
        </div>
      </section>
    )
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
            <p className="text-sm text-destructive">{errors.name.message}</p>
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
            <p className="text-sm text-destructive">{errors.slug.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Identificador único. Si se deja vacío se generará automáticamente a partir del nombre.
          </p>
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Cuenta del administrador</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Esta persona recibirá el acceso inicial a la aplicación.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="org-admin-name">Nombre del administrador *</Label>
            <Input
              id="org-admin-name"
              autoComplete="name"
              {...register('adminName')}
            />
            {errors.adminName && (
              <p className="text-sm text-destructive">{errors.adminName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-admin-email">Correo *</Label>
            <Input
              id="org-admin-email"
              type="email"
              autoComplete="email"
              {...register('adminEmail')}
            />
            {errors.adminEmail && (
              <p className="text-sm text-destructive">{errors.adminEmail.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="org-admin-password">Contraseña inicial *</Label>
            <Input
              id="org-admin-password"
              type="password"
              autoComplete="new-password"
              {...register('initialPassword')}
            />
            {errors.initialPassword && (
              <p className="text-sm text-destructive">{errors.initialPassword.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Usa al menos 8 caracteres, con letras y números. Se mostrará una sola vez al terminar.
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-info/20 bg-info/10 p-3 text-sm">
        La organización empezará con el plan Básico, hasta {basicPlan?.clientLimit ?? '—'}{' '}
        clientes y {basicPlan?.trialDays ?? '—'} días de prueba gratis.
      </div>

      <Separator />

      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
          <h4 className="text-sm font-semibold text-foreground">WhatsApp (Twilio)</h4>
        </div>

        <p className="text-xs text-muted-foreground">
          Requerido para usar WhatsApp. Cada organización debe configurar sus propias credenciales
          Twilio para poder enviar y recibir notificaciones.
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
              <p className="text-sm text-destructive">
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
              <p className="text-sm text-destructive">
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
              <p className="text-sm text-destructive">
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
              Si no se completa, WhatsApp quedará deshabilitado hasta que se configure.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting || createMutation.isPending}>
          {isSubmitting || createMutation.isPending ? 'Creando...' : 'Crear organización y acceso'}
        </Button>
      </div>
    </form>
  )
}
