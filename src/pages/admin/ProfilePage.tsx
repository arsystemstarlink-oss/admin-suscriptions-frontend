import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import { useUpdateMe, useChangePassword } from '@/hooks/useAuth'
import { getErrorHandler } from '@/lib/error-handler'
import { formatDate } from '@/lib/constants'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
import { toast } from 'sonner'
import type { ApiError } from '@/types/api'

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().min(1, 'El correo es requerido').email('Correo inválido'),
  phone: z
    .string()
    .regex(/^\+58\d{10,11}$/, 'Ingrese un teléfono venezolano válido (10-11 dígitos)')
    .optional()
    .or(z.literal('')),
  currentPassword: z.string().optional(),
})

type ProfileForm = z.infer<typeof profileSchema>

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
    newPassword: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[a-zA-Z]/, 'Debe incluir letras')
      .regex(/\d/, 'Debe incluir números'),
    confirmPassword: z.string().min(1, 'Confirme la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

type PasswordForm = z.infer<typeof passwordSchema>

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setTokens = useAuthStore((s) => s.setTokens)
  const updateMutation = useUpdateMe()
  const passwordMutation = useChangePassword()

  const {
    register: registerProfile,
    control: profileControl,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    setError: setProfileError,
    formState: { errors: profileErrors, isSubmitting: isSavingProfile },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  })

  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    reset: resetPassword,
    setError: setPasswordError,
    formState: { errors: passwordErrors, isSubmitting: isSavingPassword },
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (user) {
      resetProfile({
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        currentPassword: '',
      })
    }
  }, [user, resetProfile])

  const applyFieldError = (
    err: unknown,
    setError: (field: string, message: string) => void,
  ): boolean => {
    const apiError = err as Partial<ApiError>
    if (!apiError.code) return false
    const handler = getErrorHandler(apiError.code)
    if (handler.type === 'field-error' && handler.field) {
      setError(handler.field, handler.message)
      return true
    }
    return false
  }

  const showGenericError = (err: unknown) => {
    const apiError = err as Partial<ApiError>
    const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
    toast.error(handler?.message || apiError.message || 'Error al guardar')
  }

  if (!user) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No se pudo cargar el perfil del usuario.
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = user.name?.charAt(0).toUpperCase() || 'U'

  const onProfileSubmit = async (data: ProfileForm) => {
    const emailChanged = data.email.toLowerCase() !== user.email.toLowerCase()
    if (emailChanged && !data.currentPassword) {
      toast.error('Ingrese su contraseña actual para cambiar el correo')
      return
    }
    try {
      await updateMutation.mutateAsync({
        name: data.name,
        email: data.email,
        phone: data.phone || undefined,
        currentPassword: emailChanged ? data.currentPassword : undefined,
      })
      toast.success('Perfil actualizado correctamente')
    } catch (err) {
      const handled = applyFieldError(err, (field, message) =>
        setProfileError(field as 'name' | 'email' | 'phone' | 'currentPassword', {
          type: 'manual',
          message,
        }),
      )
      if (!handled) showGenericError(err)
    }
  }

  const onPasswordSubmit = async (data: PasswordForm) => {
    try {
      const response = await passwordMutation.mutateAsync({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      })
      setTokens(response.accessToken, response.refreshToken)
      resetPassword()
      toast.success('Contraseña actualizada correctamente')
    } catch (err) {
      const handled = applyFieldError(err, (field, message) =>
        setPasswordError(field as 'currentPassword' | 'newPassword' | 'confirmPassword', {
          type: 'manual',
          message,
        }),
      )
      if (!handled) showGenericError(err)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="flex flex-col items-center gap-4 pt-6 sm:flex-row sm:items-center">
          <div className="h-20 w-20 rounded-full flex items-center justify-center shrink-0 bg-gradient-to-br from-primary to-primary/60 shadow-sm">
            <span className="text-2xl font-bold text-primary-foreground">{initials}</span>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <div className="flex items-center justify-center gap-2 sm:justify-start">
              <h2 className="text-xl font-bold tracking-tight text-foreground">{user.name}</h2>
              <Badge variant="secondary">Administrador</Badge>
            </div>
            <p className="text-muted-foreground mt-1">{user.email}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Editar Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4" autoComplete="new-password">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Nombre *</Label>
                <Input
                  id="profile-name"
                  placeholder="Nombre del administrador"
                  data-1p-ignore
                  data-lpignore="true"
                  {...registerProfile('name')}
                />
                {profileErrors.name && (
                  <p className="text-sm text-red-600 dark:text-red-400">{profileErrors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-email">Correo *</Label>
                <Controller
                  name="email"
                  control={profileControl}
                  render={({ field }) => (
                    <EmailInput
                      id="profile-email"
                      aria-invalid={!!profileErrors.email}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {profileErrors.email && (
                  <p className="text-sm text-red-600 dark:text-red-400">{profileErrors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-phone">Teléfono</Label>
                <Controller
                  name="phone"
                  control={profileControl}
                  render={({ field }) => (
                    <PhoneInput
                      id="profile-phone"
                      aria-invalid={!!profileErrors.phone}
                      value={field.value}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                    />
                  )}
                />
                {profileErrors.phone && (
                  <p className="text-sm text-red-600 dark:text-red-400">{profileErrors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="profile-current-password">Contraseña actual (solo si cambias el correo)</Label>
                <Input
                  id="profile-current-password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...registerProfile('currentPassword')}
                />
                {profileErrors.currentPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {profileErrors.currentPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isSavingProfile}>
                {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4" autoComplete="new-password">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password-current">Contraseña actual *</Label>
                <Input
                  id="password-current"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                  {...registerPassword('currentPassword')}
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {passwordErrors.currentPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-new">Nueva contraseña *</Label>
                <Input
                  id="password-new"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Mínimo 8, con letras y números"
                  {...registerPassword('newPassword')}
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {passwordErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password-confirm">Confirmar nueva contraseña *</Label>
                <Input
                  id="password-confirm"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Repite la nueva contraseña"
                  {...registerPassword('confirmPassword')}
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    {passwordErrors.confirmPassword.message}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <Button type="submit" disabled={isSavingPassword}>
                {isSavingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Detalles de la cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Rol</p>
            <p className="text-foreground">Administrador</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Miembro desde</p>
            <p className="text-foreground">{user.createdAt ? formatDate(user.createdAt) : '—'}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Último acceso</p>
            <p className="text-foreground">{user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
