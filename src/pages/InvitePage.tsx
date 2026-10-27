import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery } from '@tanstack/react-query'
import { authApi } from '@/api/auth.api'
import { useAuthStore } from '@/stores/auth.store'
import { getErrorHandler } from '@/lib/error-handler'
import { BrandMark } from '@/components/brand/BrandMark'
import { APP_NAME } from '@/lib/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import type { ApiError } from '@/types/api'

const inviteSchema = z
  .object({
    name: z.string().optional(),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[a-zA-Z]/, 'Debe incluir letras')
      .regex(/\d/, 'Debe incluir números'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Las contraseñas no coinciden',
  })

type InviteForm = z.infer<typeof inviteSchema>

function formatDate(value: string) {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-VE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(parsed)
}

export function InvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const setTokens = useAuthStore((s) => s.setTokens)
  const setUser = useAuthStore((s) => s.setUser)
  const [showPassword, setShowPassword] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accepted, setAccepted] = useState(false)

  const previewQuery = useQuery({
    queryKey: ['invite', token],
    queryFn: () => authApi.getInvite(token!),
    enabled: Boolean(token),
    retry: false,
  })

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { name: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!token) navigate('/login', { replace: true })
  }, [token, navigate])

  const onSubmit = async (data: InviteForm) => {
    if (!token) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const response = await authApi.acceptInvite({
        token,
        password: data.password,
        ...(data.name?.trim() ? { name: data.name.trim() } : {}),
      })
      setTokens(response.accessToken, response.refreshToken, 'local')
      setUser(response.user)
      setAccepted(true)
      setTimeout(() => navigate('/dashboard', { replace: true }), 900)
    } catch (err) {
      const apiError = err as Partial<ApiError>
      if (apiError.code === 'WEAK_PASSWORD') {
        setError('password', { type: 'manual', message: apiError.message })
      } else {
        const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
        setSubmitError(handler?.message || apiError.message || 'No se pudo aceptar la invitación.')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (previewQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (previewQuery.isError || !previewQuery.data) {
    const apiError = previewQuery.error as Partial<ApiError> | undefined
    const handler = apiError?.code ? getErrorHandler(apiError.code as ApiError['code']) : undefined
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Invitación no disponible</h1>
          <p className="mt-2 max-w-md text-sm text-muted-foreground">
            {handler?.message ||
              apiError?.message ||
              'Este enlace no es válido o ya fue utilizado. Solicita una nueva invitación.'}
          </p>
        </div>
        <Link to="/login" className="text-sm font-medium text-primary hover:underline">
          Ir a iniciar sesión
        </Link>
      </div>
    )
  }

  if (accepted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
          <CheckCircle2 className="h-9 w-9 text-success" />
        </div>
        <h1 className="text-xl font-semibold text-foreground">Acceso configurado</h1>
        <p className="text-sm text-muted-foreground">Entrando a tu organización...</p>
      </div>
    )
  }

  const invite = previewQuery.data.invite

  return (
    <div className="flex min-h-screen flex-col bg-background px-6 py-10 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col items-center">
        <BrandMark size="lg" hideSystemOnMobile={false} />
        <div className="mt-8 w-full rounded-2xl border border-border bg-surface p-6 shadow-sm">
          <h1 className="text-xl font-semibold tracking-tight">Configura tu acceso</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Invitación para <span className="font-medium text-foreground">{invite.email}</span> en{' '}
            <span className="font-medium text-foreground">{invite.organizationName}</span>.
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Enlace válido hasta el {formatDate(invite.expiresAt)}.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4" autoComplete="off">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Nombre (opcional)</Label>
              <Input
                id="invite-name"
                autoComplete="name"
                placeholder="Confirma o ajusta tu nombre"
                {...register('name')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-password">Nueva contraseña *</Label>
              <div className="relative">
                <Input
                  id="invite-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className="pr-10"
                  placeholder="Mínimo 8, con letras y números"
                  {...register('password')}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-confirm-password">Confirmar contraseña *</Label>
              <Input
                id="invite-confirm-password"
                type="password"
                autoComplete="new-password"
                {...register('confirmPassword')}
              />
              {errors.confirmPassword && (
                <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
              )}
            </div>

            {submitError && (
              <p className="rounded-md border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                {submitError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Configurando...' : 'Activar mi acceso'}
            </Button>
          </form>
        </div>
        <p className="mt-6 text-xs text-muted-foreground">{APP_NAME}</p>
      </div>
    </div>
  )
}
