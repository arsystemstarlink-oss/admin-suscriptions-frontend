import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import { useUpdateMe, useChangePassword } from '@/hooks/useAuth'
import { getErrorHandler } from '@/lib/error-handler'
import {
  formatDate,
  ORGANIZATION_PLAN_STATUS_LABELS,
  PLAN_USAGE_WARNING_PERCENT,
  STATUS_ERROR,
  STATUS_SUCCESS,
  STATUS_WARNING,
} from '@/lib/constants'
import { getPlanLabel } from '@/lib/business-plan-catalog'
import { getOrganizationPlanAccess } from '@/lib/business-plan'
import { PlanUpgradeButton } from '@/components/plans/PlanUpgradeButton'
import { OrganizationPlanPaymentReportSheet } from '@/components/organizations/OrganizationPlanPaymentReportSheet'
import {
  useBusinessPlans,
  useOrganizationPlanPaymentReports,
} from '@/hooks/useOrganizationPlanPaymentReports'
import { getInitial } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PhoneInput } from '@/components/ui/phone-input'
import { EmailInput } from '@/components/ui/email-input'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import {
  Bell,
  CreditCard,
  UserCog,
  ShieldCheck,
  CalendarDays,
  Clock3,
  LogOut,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { FormGroup, SettingsTabTrigger, SettingsTabsList } from '@/components/design-system'
import { NotificationSettings } from '@/pages/admin/NotificationsPage'
import type { ApiError, OrganizationPlanPaymentReportStatus } from '@/types/api'
import { isValidInternationalPhone, PHONE_VALIDATION_MESSAGE } from '@/lib/phone'

const profileSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().min(1, 'El correo es requerido').email('Correo inválido'),
  phone: z
    .string()
    .refine((value) => !value || isValidInternationalPhone(value), PHONE_VALIDATION_MESSAGE)
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
    confirmPassword: z.string().min(1, 'Confirma la nueva contraseña'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

type PasswordForm = z.infer<typeof passwordSchema>
type ProfileSection = 'account' | 'security' | 'notifications' | 'plan'

const PLAN_REPORT_STATUS: Record<
  OrganizationPlanPaymentReportStatus,
  { label: string; className: string }
> = {
  PENDING: { label: 'En verificación', className: STATUS_WARNING },
  APPROVED: { label: 'Aprobado', className: STATUS_SUCCESS },
  REJECTED: { label: 'Rechazado', className: STATUS_ERROR },
}

export function ProfilePage() {
  const user = useAuthStore((s) => s.user)
  const setTokens = useAuthStore((s) => s.setTokens)
  const setUser = useAuthStore((s) => s.setUser)
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const updateMutation = useUpdateMe()
  const passwordMutation = useChangePassword()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [isEditingSecurity, setIsEditingSecurity] = useState(false)
  const [activeSection, setActiveSection] = useState<ProfileSection>(() =>
    user?.mustChangePassword ? 'security' : 'account',
  )
  const [showPlanReport, setShowPlanReport] = useState(false)
  const { data: plansData, isLoading: plansLoading } = useBusinessPlans()
  const mustChangePassword = user?.mustChangePassword === true
  const { data: planReportsData } = useOrganizationPlanPaymentReports(
    user?.role === 'admin' && !mustChangePassword,
  )

  useEffect(() => {
    if (mustChangePassword) {
      setIsEditingSecurity(true)
      setActiveSection('security')
    }
  }, [mustChangePassword])

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
    toast.error(handler?.message || apiError.message || 'No se pudieron guardar los cambios')
  }

  if (!user) {
    return (
      <div className="space-y-3 sm:space-y-4 md:space-y-6">
        <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
          <CardContent className="py-12 text-center text-muted-foreground">
            No se pudo cargar el perfil del usuario.
          </CardContent>
        </Card>
      </div>
    )
  }

  const initials = getInitial(user.name, 'U')
  const organization = user.role === 'admin' ? user.organization : undefined
  const planAccess = getOrganizationPlanAccess(organization)
  const planCatalogItem = plansData?.plans.find((plan) => plan.key === organization?.plan)
  const planPrice = planCatalogItem?.priceUsdMonthly ?? null
  const recentPlanReports = planReportsData?.reports.slice(0, 3) ?? []
  const changeSection = (value: string) => {
    if (value === 'account' || value === 'security' || value === 'notifications' || value === 'plan') {
      setActiveSection(value)
    }
  }

  const onProfileSubmit = async (data: ProfileForm) => {
    const emailChanged = data.email.toLowerCase() !== user.email.toLowerCase()
    if (emailChanged && !data.currentPassword) {
      toast.error('Ingresa tu contraseña actual para cambiar el correo')
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
      setUser(response.user)
      resetPassword()
      if (mustChangePassword) {
        toast.success('Contraseña actualizada. Ya puedes usar la aplicación.')
        navigate('/dashboard', { replace: true })
      } else {
        toast.success('Contraseña actualizada correctamente')
      }
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
      {mustChangePassword && (
        <div className="rounded-xl border border-warning/30 bg-warning/10 p-4">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div>
              <p className="font-semibold text-foreground">Cambia tu contraseña inicial</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Usaste una contraseña temporal para entrar. Define una nueva para desbloquear el
                resto de la aplicación.
              </p>
            </div>
          </div>
        </div>
      )}
      <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 sm:h-14 sm:w-14">
                <span className="text-lg font-bold text-primary-text sm:text-xl">{initials}</span>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold sm:text-xl">{user.name}</h3>
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="min-w-0 truncate text-sm text-muted-foreground">{user.email}</p>
                <Badge
                  variant="secondary"
                  className="shrink-0 px-1.5 py-0 text-xs leading-5 sm:hidden"
                >
                  <ShieldCheck className="mr-1 h-3 w-3 shrink-0" aria-hidden="true" />
                  {user.role === 'super-admin' ? 'Super' : 'Admin'}
                </Badge>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <Badge variant="secondary" className="hidden text-xs sm:inline-flex">
                <ShieldCheck className="mr-1 h-3 w-3 shrink-0" aria-hidden="true" />
                {user.role === 'super-admin' ? 'Super Admin' : 'Administrador'}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={logout}
                aria-label="Cerrar sesión"
                className="min-w-11 shrink-0 px-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive sm:min-w-0 sm:px-3"
              >
                <LogOut className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">Cerrar sesión</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeSection} onValueChange={changeSection}>
        <SettingsTabsList
          aria-label="Secciones del perfil"
          className={user.role === 'admin' ? 'grid-cols-4' : 'grid-cols-3'}
        >
          <SettingsTabTrigger value="account" icon={UserCog} label="Cuenta" />
          <SettingsTabTrigger value="security" icon={ShieldCheck} label="Seguridad" />
          <SettingsTabTrigger
            value="notifications"
            icon={Bell}
            label="Notificaciones"
            shortLabel="Avisos"
          />
          {user.role === 'admin' && (
            <SettingsTabTrigger value="plan" icon={CreditCard} label="Plan" />
          )}
        </SettingsTabsList>

      {user.role === 'admin' && (
        <TabsContent value="plan" forceMount className="mt-4 data-[state=inactive]:hidden">
        <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
          <CardHeader className="p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-semibold text-lg">Mi plan</h2>
              {organization?.planStatus && (
                <Badge variant="outline" className="text-info bg-info/10 border-info/20">
                  {ORGANIZATION_PLAN_STATUS_LABELS[organization.planStatus]}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              El plan incluye todas las funciones y WhatsApp. Solo cambian los límites de clientes y administradores.
            </p>
          </CardHeader>
          <CardContent className="space-y-4 p-4 pt-0 sm:p-5 sm:pt-0">
            {organization?.plan ? (
              <>
                <div>
                  <p className="text-xl font-semibold">{getPlanLabel(plansData?.plans, organization.plan)}</p>
                  <p className="text-sm text-muted-foreground">
                    {plansLoading
                      ? 'Cargando precio...'
                      : planPrice === null
                        ? 'Precio acordado según tus necesidades'
                        : `${planPrice} USD al mes`}
                  </p>
                </div>
                {planAccess.clientCount !== null && planAccess.clientLimit !== null && (
                  <div className="space-y-2">
                    <div className="flex justify-between gap-2 text-sm">
                      <span>Clientes registrados</span>
                      <span className="font-medium">
                        {planAccess.clientCount} de {planAccess.clientLimit}
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="Uso del límite de clientes"
                      aria-valuemin={0}
                      aria-valuemax={planAccess.clientLimit}
                      aria-valuenow={Math.min(planAccess.clientCount, planAccess.clientLimit)}
                      className="h-2 overflow-hidden rounded-full bg-surface-muted"
                    >
                      <div
                        className={`h-full rounded-full ${
                          planAccess.isAtLimit ? 'bg-warning' : 'bg-primary'
                        }`}
                        style={{ width: `${planAccess.usagePercent ?? 0}%` }}
                      />
                    </div>
                    {planAccess.usagePercent !== null &&
                      planAccess.usagePercent >= PLAN_USAGE_WARNING_PERCENT &&
                      !planAccess.isAtLimit && (
                        <p className="text-sm text-warning">
                          Estás cerca del límite. Puedes elegir un plan con más espacio cuando lo
                          necesites.
                        </p>
                      )}
                    {planAccess.isAtLimit && (
                      <p className="text-sm text-warning">
                        Llegaste al límite. Tus clientes actuales siguen disponibles, pero no podrás
                        añadir más hasta elegir otro plan.
                      </p>
                    )}
                  </div>
                )}
                {planAccess.trialDaysRemaining !== null && (
                  <p className="text-sm text-muted-foreground">
                    {planAccess.trialDaysRemaining === 0
                      ? 'La prueba gratis venció.'
                      : `Te quedan ${planAccess.trialDaysRemaining} días de prueba gratis.`}
                  </p>
                )}
                {organization.planStatus === 'activo' && organization.planExpiresAt && (
                  <p className="text-sm text-muted-foreground">
                    Vence el {formatDate(organization.planExpiresAt)}.
                  </p>
                )}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    type="button"
                    className="flex-1"
                    onClick={() => setShowPlanReport(true)}
                  >
                    Reportar pago
                  </Button>
                  <PlanUpgradeButton organization={organization} className="flex-1" />
                </div>

                {recentPlanReports.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Pagos de planes reportados</p>
                    <div className="space-y-1.5">
                      {recentPlanReports.map((report) => {
                        const status = PLAN_REPORT_STATUS[report.status]
                        return (
                          <div
                            key={report.id}
                            className="rounded-lg border border-border-subtle bg-surface-muted px-3 py-2 text-sm"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="min-w-0 truncate text-muted-foreground">
                                {report.months} {report.months === 1 ? 'mes' : 'meses'} ·{' '}
                                {formatDate(report.createdAt)}
                              </span>
                              <Badge variant="outline" className={status.className}>
                                {status.label}
                              </Badge>
                            </div>
                            {report.status === 'REJECTED' && report.reviewNotes && (
                              <p className="mt-1 text-xs text-destructive">
                                Motivo: {report.reviewNotes}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                La información del plan todavía no está disponible.
              </p>
            )}
          </CardContent>
        </Card>
        </TabsContent>
      )}

      <TabsContent value="account" forceMount className="mt-4 space-y-4 data-[state=inactive]:hidden">
      <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <UserCog className="h-5 w-5 text-muted-foreground shrink-0" />
              <h2 className="font-semibold text-lg truncate">Datos personales</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
              className="shrink-0"
            >
              {isEditingProfile ? 'Cancelar' : 'Editar'}
            </Button>
          </div>
          {!isEditingProfile && (
            <p className="mt-1 pl-7 text-sm text-muted-foreground">
              Información de contacto asociada a tu cuenta
            </p>
          )}
        </CardHeader>
        {isEditingProfile ? (
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
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
                      <p className="text-sm text-destructive">{profileErrors.name.message}</p>
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
                      <p className="text-sm text-destructive">{profileErrors.email.message}</p>
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
                      <p className="text-sm text-destructive">{profileErrors.phone.message}</p>
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
                    <p className="text-sm text-destructive">
                      {profileErrors.currentPassword.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Por seguridad, debes confirmar tu contraseña actual para cambiar el correo electrónico asociado.
                  </p>
                </div>
              </FormGroup>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={isSavingProfile} className="w-full sm:w-auto">
                  {isSavingProfile ? 'Guardando...' : 'Guardar cambios'}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 text-surface-muted-foreground sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-surface-foreground">
                  <UserRound className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Nombre</p>
                  <p className="wrap-break-word text-sm font-semibold text-foreground sm:text-base">{user.name}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 text-surface-muted-foreground sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-surface-foreground">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Correo</p>
                  <p className="break-all text-sm font-semibold text-foreground sm:text-base">{user.email}</p>
                </div>
              </div>
              <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 text-surface-muted-foreground sm:col-span-2 sm:p-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface text-surface-foreground">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Teléfono</p>
                  <p className="text-sm font-semibold text-foreground sm:text-base">{user.phone || 'Sin teléfono registrado'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <h2 className="font-semibold text-lg">Fechas de la cuenta</h2>
          <p className="text-sm text-muted-foreground">
            Antigüedad y último acceso registrado.
          </p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 p-4 pt-0 sm:grid-cols-2 sm:gap-3 sm:p-5 sm:pt-0">
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 sm:p-4">
            <CalendarDays className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Miembro desde</p>
              <p className="text-sm font-semibold text-foreground sm:text-base">
                {user.createdAt ? formatDate(user.createdAt) : '—'}
              </p>
            </div>
          </div>
          <div className="flex min-w-0 items-center gap-3 rounded-xl border border-border-subtle bg-surface-muted p-3 sm:p-4">
            <Clock3 className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Último acceso</p>
              <p className="text-sm font-semibold text-foreground sm:text-base">
                {user.lastLoginAt ? formatDate(user.lastLoginAt) : '—'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </TabsContent>

      <TabsContent value="security" forceMount className="mt-4 data-[state=inactive]:hidden">
      <Card className="bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm">
        <CardHeader className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <ShieldCheck className="h-5 w-5 text-muted-foreground shrink-0" />
              <h2 className="font-semibold text-lg truncate">Seguridad</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingSecurity(!isEditingSecurity)}
              className="shrink-0"
            >
              {isEditingSecurity ? 'Cancelar' : 'Cambiar'}
            </Button>
          </div>
        </CardHeader>
        {isEditingSecurity ? (
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
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
                      <p className="text-sm text-destructive">
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
                      <p className="text-sm text-destructive">
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
                      <p className="text-sm text-destructive">
                        {passwordErrors.confirmPassword.message}
                      </p>
                    )}
                  </div>
                </div>
              </FormGroup>

              <div className="flex items-center gap-3 pt-2">
                <Button type="submit" disabled={isSavingPassword} className="w-full sm:w-auto">
                  {isSavingPassword ? 'Actualizando...' : 'Cambiar contraseña'}
                </Button>
              </div>
            </form>
          </CardContent>
        ) : (
          <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
            <div className="flex items-center gap-3 p-3 sm:p-4 bg-surface-muted rounded-xl border border-border-subtle">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <ShieldCheck className="h-5 w-5 text-primary-text" />
              </div>
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-muted-foreground">Contraseña</p>
                <p className="text-sm sm:text-base font-semibold text-foreground">••••••••</p>
              </div>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-3">
              Por seguridad, la contraseña no se muestra. Puedes cambiarla cuando lo necesites.
            </p>
          </CardContent>
        )}
      </Card>
      </TabsContent>

      <TabsContent value="notifications" forceMount className="mt-4 data-[state=inactive]:hidden">
        <NotificationSettings />
      </TabsContent>
      </Tabs>

      {organization && (
        <OrganizationPlanPaymentReportSheet
          organization={organization}
          open={showPlanReport}
          onOpenChange={setShowPlanReport}
        />
      )}
    </div>
  )
}
