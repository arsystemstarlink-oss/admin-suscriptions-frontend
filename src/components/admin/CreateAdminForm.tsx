import { useMemo, useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/auth.api'
import { organizationsApi } from '@/api/organizations.api'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { getErrorHandler } from '@/lib/error-handler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import type { ApiError, CreateAdminRequest, UserRole } from '@/types/api'

export const NEW_ORG_VALUE = '__new__'

const adminFields = {
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().min(1, 'El correo es requerido').email('Correo inválido'),
  phone: z
    .string()
    .regex(/^\+58\d{10,11}$/, 'Ingrese un teléfono venezolano válido (10-11 dígitos)')
    .optional()
    .or(z.literal('')),
  password: z
    .string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[a-zA-Z]/, 'Debe incluir letras')
    .regex(/\d/, 'Debe incluir números'),
  confirmPassword: z.string().min(1, 'Confirme la contraseña'),
}

const confirmRefine = {
  path: ['confirmPassword'],
  message: 'Las contraseñas no coinciden',
}

const registerSchema = z
  .object(adminFields)
  .refine((data) => data.password === data.confirmPassword, confirmRefine)

const superAdminRegisterSchema = z
  .object({
    ...adminFields,
    role: z.enum(['admin', 'super-admin']),
    organizationId: z.string().optional(),
    newOrganizationName: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, confirmRefine)
  .superRefine((data, ctx) => {
    if (data.role === 'admin') {
      if (!data.organizationId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['organizationId'],
          message: 'Seleccione una organización.',
        })
      } else if (data.organizationId === NEW_ORG_VALUE && !(data.newOrganizationName || '').trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['newOrganizationName'],
          message: 'El nombre de la nueva organización es requerido.',
        })
      }
    }
  })

const setupSchema = z
  .object({
    setupKey: z.string().min(1, 'La clave de configuración es requerida'),
    ...adminFields,
  })
  .refine((data) => data.password === data.confirmPassword, confirmRefine)

type AdminForm = z.infer<typeof setupSchema> & {
  role?: UserRole
  organizationId?: string
  newOrganizationName?: string
}

type AdminFormField =
  | 'name'
  | 'email'
  | 'phone'
  | 'password'
  | 'setupKey'
  | 'confirmPassword'
  | 'organizationId'
  | 'newOrganizationName'

interface CreateAdminFormProps {
  mode: 'setup' | 'register'
  onSuccess?: () => void
  onSetupDisabled?: () => void
}

export function CreateAdminForm({ mode, onSuccess, onSetupDisabled }: CreateAdminFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSuperAdmin = useIsSuperAdmin()
  const isSuperRegister = mode === 'register' && isSuperAdmin
  const prefix = mode === 'setup' ? 'setup' : 'admin'

  const resolver = useMemo(() => {
    if (mode === 'setup') return zodResolver(setupSchema) as unknown as Resolver<AdminForm>
    if (isSuperAdmin) {
      return zodResolver(superAdminRegisterSchema) as unknown as Resolver<AdminForm>
    }
    return zodResolver(registerSchema) as unknown as Resolver<AdminForm>
  }, [mode, isSuperAdmin])

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm<AdminForm>({
    resolver,
    defaultValues: isSuperRegister
      ? { role: 'admin', organizationId: '', newOrganizationName: '' }
      : undefined,
  })

  const watchedRole = watch('role')
  const watchedOrganizationId = watch('organizationId')

  const { data: organizationsData } = useOrganizations(
    { limit: 100 },
    { enabled: isSuperRegister },
  )
  const activeOrganizations = (organizationsData?.organizations || []).filter((o) => o.active)

  const applyFieldError = (err: unknown): boolean => {
    const apiError = err as Partial<ApiError>
    if (!apiError.code) return false
    const handler = getErrorHandler(apiError.code)
    if (handler.type === 'field-error' && handler.field) {
      setError(handler.field as AdminFormField, {
        type: 'manual',
        message: handler.message,
      })
      return true
    }
    return false
  }

  const showGenericError = (err: unknown) => {
    const apiError = err as Partial<ApiError>
    const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
    toast.error(handler?.message || apiError.message || 'Error al crear el administrador')
  }

  const onSubmit = async (data: AdminForm) => {
    setIsSubmitting(true)
    try {
      const payload: CreateAdminRequest = {
        name: data.name,
        email: data.email,
        password: data.password,
        phone: data.phone || undefined,
      }

      if (isSuperRegister && mode === 'register') {
        payload.role = data.role
        if (data.role === 'admin') {
          let organizationId = data.organizationId
          if (organizationId === NEW_ORG_VALUE) {
            const created = await organizationsApi.create({
              name: (data.newOrganizationName || '').trim(),
            })
            organizationId = created.id
          }
          payload.organizationId = organizationId
        }
      }

      if (mode === 'setup') {
        await authApi.setup(payload, data.setupKey)
        toast.success('Administrador creado correctamente. Inicia sesión.')
      } else {
        await authApi.register(payload)
        toast.success('Administrador creado correctamente.')
      }
      reset()
      onSuccess?.()
    } catch (err) {
      const apiError = err as Partial<ApiError>
      if (apiError.code === 'SETUP_DISABLED') {
        toast.error(getErrorHandler('SETUP_DISABLED').message)
        onSetupDisabled?.()
        return
      }
      if (!applyFieldError(err)) showGenericError(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" autoComplete="new-password">
      {mode === 'setup' && (
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-setup-key`}>Clave de configuración *</Label>
          <Input
            id={`${prefix}-setup-key`}
            type="password"
            autoComplete="new-password"
            placeholder="La clave secreta del despliegue"
            {...register('setupKey')}
          />
          {errors.setupKey && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.setupKey.message}</p>
          )}
        </div>
      )}

      {isSuperRegister && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor={`${prefix}-role`}>Rol *</Label>
            <Controller
              name="role"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id={`${prefix}-role`} aria-invalid={!!errors.role}>
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrador</SelectItem>
                    <SelectItem value="super-admin">Super administrador</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.role && (
              <p className="text-sm text-red-600 dark:text-red-400">{errors.role.message}</p>
            )}
          </div>

          {watchedRole !== 'super-admin' && (
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-organization`}>Organización *</Label>
              <Controller
                name="organizationId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value || ''} onValueChange={field.onChange}>
                    <SelectTrigger
                      id={`${prefix}-organization`}
                      aria-invalid={!!errors.organizationId}
                    >
                      <SelectValue placeholder="Selecciona una organización" />
                    </SelectTrigger>
                    <SelectContent>
                      {activeOrganizations.map((org) => (
                        <SelectItem key={org.id} value={org.id}>
                          {org.name}
                        </SelectItem>
                      ))}
                      <SelectSeparator />
                      <SelectItem value={NEW_ORG_VALUE}>Crear nueva organización…</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.organizationId && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.organizationId.message}
                </p>
              )}
            </div>
          )}

          {watchedRole !== 'super-admin' && watchedOrganizationId === NEW_ORG_VALUE && (
            <div className="space-y-2">
              <Label htmlFor={`${prefix}-new-org-name`}>Nombre de la nueva organización *</Label>
              <Input
                id={`${prefix}-new-org-name`}
                placeholder="Ej. Starlink Valencia"
                {...register('newOrganizationName')}
              />
              {errors.newOrganizationName && (
                <p className="text-sm text-red-600 dark:text-red-400">
                  {errors.newOrganizationName.message}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`${prefix}-name`}>Nombre *</Label>
          <Input
            id={`${prefix}-name`}
            placeholder="Nombre del administrador"
            data-1p-ignore
            data-lpignore="true"
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${prefix}-email`}>Correo *</Label>
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <EmailInput
                id={`${prefix}-email`}
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

        <div className="space-y-2">
          <Label htmlFor={`${prefix}-phone`}>Teléfono</Label>
          <Controller
            name="phone"
            control={control}
            render={({ field }) => (
              <PhoneInput
                id={`${prefix}-phone`}
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
          <Label htmlFor={`${prefix}-password`}>Contraseña *</Label>
          <Input
            id={`${prefix}-password`}
            type="password"
            autoComplete="new-password"
            placeholder="Mínimo 8, con letras y números"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor={`${prefix}-confirm`}>Confirmar contraseña *</Label>
          <Input
            id={`${prefix}-confirm`}
            type="password"
            autoComplete="new-password"
            placeholder="Repite la contraseña"
            {...register('confirmPassword')}
          />
          {errors.confirmPassword && (
            <p className="text-sm text-red-600 dark:text-red-400">{errors.confirmPassword.message}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting
            ? 'Creando...'
            : mode === 'setup'
              ? 'Crear el primer administrador'
              : 'Crear administrador'}
        </Button>
      </div>
    </form>
  )
}
