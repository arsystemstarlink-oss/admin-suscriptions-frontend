import { useState } from 'react'
import { useForm, Controller, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authApi } from '@/api/auth.api'
import { getErrorHandler } from '@/lib/error-handler'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
import { toast } from 'sonner'
import type { ApiError, CreateAdminRequest } from '@/types/api'

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

const setupSchema = z
  .object({
    setupKey: z.string().min(1, 'La clave de configuración es requerida'),
    ...adminFields,
  })
  .refine((data) => data.password === data.confirmPassword, confirmRefine)
type AdminForm = z.infer<typeof setupSchema>

interface CreateAdminFormProps {
  mode: 'setup' | 'register'
  onSuccess?: () => void
  onSetupDisabled?: () => void
}

export function CreateAdminForm({ mode, onSuccess, onSetupDisabled }: CreateAdminFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const prefix = mode === 'setup' ? 'setup' : 'admin'
  const resolver =
    mode === 'setup'
      ? (zodResolver(setupSchema) as unknown as Resolver<AdminForm>)
      : (zodResolver(registerSchema) as unknown as Resolver<AdminForm>)

  const {
    register,
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<AdminForm>({
    resolver,
  })

  const applyFieldError = (err: unknown): boolean => {
    const apiError = err as Partial<ApiError>
    if (!apiError.code) return false
    const handler = getErrorHandler(apiError.code)
    if (handler.type === 'field-error' && handler.field) {
      setError(
        handler.field as 'name' | 'email' | 'phone' | 'password' | 'setupKey' | 'confirmPassword',
        {
          type: 'manual',
          message: handler.message,
        },
      )
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
