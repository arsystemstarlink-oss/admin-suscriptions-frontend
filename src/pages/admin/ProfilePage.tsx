import { useState, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import { useUpdateMe, useChangePassword } from '@/hooks/useAuth'
import { getErrorHandler } from '@/lib/error-handler'
import { formatDate } from '@/lib/constants'
import { getInitial } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
import { UserCog, ShieldCheck, ChevronDown, ChevronUp, Pencil, LogOut } from 'lucide-react'
import { toast } from 'sonner'
import { SectionHeader, FormGroup } from '@/components/design-system'
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
  const logout = useAuthStore((s) => s.logout)
  const updateMutation = useUpdateMe()
  const passwordMutation = useChangePassword()
  const [showDetails, setShowDetails] = useState(false)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingSecurity, setIsEditingSecurity] = useState(false)

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
      <div className="space-y-4 md:space-y-6">
        <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
          <CardContent className="py-12 text-center text-primary-500 dark:text-primary-400">
            No se pudo cargar el perfil del usuario.
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = getInitial(user.name, 'U')

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
    <div className="space-y-4 md:space-y-6">
      <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
        <CardContent className="p-5">
          <div className="flex items-start gap-3 sm:items-center sm:gap-4 min-w-0">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl flex items-center justify-center bg-primary-100 dark:bg-primary-800 shrink-0">
              <span className="text-lg font-bold text-primary-700 dark:text-primary-300">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-lg sm:text-xl truncate">{user.name}</h3>
              <p className="text-sm text-primary-500 dark:text-primary-400 mt-1 truncate">{user.email}</p>
            </div>
            <div className="shrink-0 flex items-center gap-1.5 sm:gap-2">
              <Badge variant="secondary" className="text-xs">
                <ShieldCheck className="h-3 w-3 mr-1 shrink-0" />
                Administrador
              </Badge>
              <button
                onClick={logout}
                className="inline-flex items-center justify-center h-8 w-8 rounded-md text-primary-500 dark:text-primary-400 transition-colors hover:bg-destructive/10 hover:text-destructive dark:hover:text-red-400"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
              >
                <LogOut className="h-4 w-4 shrink-0" />
              </button>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-primary-100 dark:border-primary-800">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center justify-between w-full text-left"
            >
              <span className="text-sm font-medium text-primary-600 dark:text-primary-400">Detalles de la cuenta</span>
              {showDetails ? (
                <ChevronUp className="h-4 w-4 text-primary-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-primary-400" />
              )}
            </button>
            
            {showDetails && (
              <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                  <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Rol</p>
                  <p className="text-lg font-semibold text-primary-900 dark:text-primary-50">Administrador</p>
                </div>
                <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                  <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Miembro desde</p>
                  <p className="text-lg font-semibold text-primary-900 dark:text-primary-50">{user.createdAt ? formatDate(user.createdAt) : '—'}</p>
                </div>
                <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                  <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Último acceso</p>
                  <p className="text-lg font-semibold text-primary-900 dark:text-primary-50">{user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
        <CardHeader className="p-5">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Editar Perfil"
              icon={<UserCog className="h-5 w-5" />}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="shrink-0"
            >
              <Pencil className="h-4 w-4 mr-2 shrink-0" />
              {isEditingProfile ? 'Cancelar' : 'Editar'}
            </Button>
          </div>
        </CardHeader>
        {isEditingProfile ? (
          <CardContent className="p-5 pt-0">
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4" autoComplete="new-password">
              <FormGroup label="Datos personales" description="Información pública de tu cuenta">
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

                  <div className="space-y-2 md:col-span-2">
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
                </div>
              </FormGroup>

              <FormGroup label="Verificación" description="Requerida solo si cambias el correo electrónico">
                <div className="space-y-2">
                  <Label htmlFor="profile-current-password">Contraseña actual</Label>
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
                  <p className="text-xs text-primary-500 dark:text-primary-400">
                    Por seguridad, debes confirmar tu contraseña actual para cambiar el correo electrónico asociado.
                  </p>
                </div>
              </FormGroup>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent className="p-5 pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Nombre</p>
                <p className="font-semibold text-primary-900 dark:text-primary-50">{user.name}</p>
              </div>
              <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800">
                <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Correo</p>
                <p className="font-semibold text-primary-900 dark:text-primary-50">{user.email}</p>
              </div>
              <div className="p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800 md:col-span-2">
                <p className="text-sm text-primary-500 dark:text-primary-400 mb-1">Teléfono</p>
                <p className="font-semibold text-primary-900 dark:text-primary-50">{user.phone || '—'}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm">
        <CardHeader className="p-5">
          <div className="flex items-center justify-between">
            <SectionHeader
              title="Seguridad"
              icon={<ShieldCheck className="h-5 w-5" />}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingSecurity(!isEditingSecurity)}
              className="shrink-0"
            >
              <Pencil className="h-4 w-4 mr-2 shrink-0" />
              {isEditingSecurity ? 'Cancelar' : 'Cambiar'}
            </Button>
          </div>
        </CardHeader>
        {isEditingSecurity ? (
          <CardContent className="p-5 pt-0">
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4" autoComplete="new-password">
              <FormGroup label="Cambiar contraseña" description="Actualiza tu credencial de acceso">
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
              </FormGroup>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={isSavingPassword}>
                  {isSavingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent className="p-5 pt-0">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary-100 dark:bg-primary-800 flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5 text-primary-600 dark:text-primary-300" />
                </div>
                <div>
                  <p className="text-sm text-primary-500 dark:text-primary-400">Contraseña</p>
                  <p className="font-semibold text-primary-900 dark:text-primary-50">••••••••</p>
                </div>
              </div>
              <p className="text-xs text-primary-500 dark:text-primary-400">
                Por seguridad, la contraseña no se muestra. Puedes cambiarla cuando lo necesites.
              </p>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}
