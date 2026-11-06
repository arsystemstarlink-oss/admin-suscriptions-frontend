import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuthStore } from '@/stores/auth.store'
import { authApi } from '@/api/auth.api'
import type { ApiError } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { APP_NAME } from '@/lib/brand'

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'El correo es requerido')
    .email('Correo electrónico inválido'),
  password: z
    .string()
    .min(1, 'La contraseña es requerida'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setTokens, setUser, user } = useAuthStore()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const from = (location.state as {
    from?: { pathname?: string; search?: string; hash?: string }
  } | null)?.from
  const fromPath = from?.pathname
  const returnTo =
    fromPath?.startsWith('/') && !fromPath.startsWith('//')
      ? `${fromPath}${from?.search ?? ''}${from?.hash ?? ''}`
      : '/dashboard'

  useEffect(() => {
    if (isAuthenticated) navigate(returnTo, { replace: true })
  }, [isAuthenticated, returnTo, navigate])

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem('auth.rememberMe') !== 'false'
  )
  const [showSuccess, setShowSuccess] = useState(false)
  const [shakeError, setShakeError] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, touchedFields, isSubmitted },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  })

  const emailValue = watch('email', '')

  const emailHasValue = emailValue.length > 0
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
  const emailShowError =
    emailHasValue && !emailIsValid && (touchedFields.email || isSubmitted)
  const emailShowValid = emailHasValue && emailIsValid
  const passwordShowError = !!errors.password

  const triggerShake = () => {
    setShakeError(true)
    setTimeout(() => setShakeError(false), 500)
  }

  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setIsLoading(true)

    try {
      const response = await authApi.login({
        ...data,
        rememberMe,
      })
      setTokens(
        response.accessToken,
        response.refreshToken,
        rememberMe ? 'local' : 'session'
      )
      setUser(response.user)

      setShowSuccess(true)
      const target = response.user.mustChangePassword ? '/config/profile' : returnTo
      setTimeout(() => {
        navigate(target, { replace: true })
      }, 900)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'INVALID_CREDENTIALS') {
        setError('Correo o contraseña incorrectos')
      } else if (!navigator.onLine) {
        setError('Sin conexión a internet. Revisa tu red e inténtalo de nuevo.')
      } else {
        setError('Error al iniciar sesión. Intente nuevamente.')
      }
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center animate-fade-slide-up">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success/10 shadow-sm">
            <CheckCircle2 className="h-9 w-9 text-success shrink-0" />
          </div>
          <h2 className="text-xl font-semibold text-foreground tracking-tight">
            ¡Bienvenido{user?.name ? `, ${user.name}` : ''}!
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Redirigiendo a tu panel...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10 selection:text-primary-text">
      {/* Branding Area — centrado, generoso espacio negativo */}
      <header className="flex flex-col items-center pt-12 pb-2 px-6">
        <div className="inline-flex items-center justify-center px-5 py-3">
          <BrandMark size="xl" hideSystemOnMobile={false} />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground leading-tight text-center">
          Iniciar sesión
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground text-center leading-relaxed">
          Accede a tu panel de administración
        </p>
      </header>

      {/* Main content — desplazado al centro-bajo para zona del pulgar */}
      <main className="flex-1 flex items-center px-5 pb-6 sm:px-8">
        <div
          className={cn(
            'w-full max-w-md mx-auto animate-fade-slide-up',
            shakeError && 'animate-shake'
          )}
        >
          {/* Card de superficie estándar */}
          <div className="rounded-[1.1rem] border border-border bg-surface text-surface-foreground p-5 shadow-[0_6px_20px_rgb(0,0,0,0.04)] dark:shadow-[0_6px_20px_rgb(0,0,0,0.1)]">
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-3.5"
              noValidate
              aria-label="Formulario de inicio de sesión"
            >
              {/* Error banner */}
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/5 px-3.5 py-3 text-sm text-destructive animate-fade-in"
                >
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span className="leading-snug">{error}</span>
                </div>
              )}

              {/* Email input con icono */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-[0.8125rem] font-semibold text-foreground tracking-wide"
                >
                  Correo electrónico
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Mail className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    placeholder="tu@correo.com"
                    autoComplete="email"
                    autoFocus
                    disabled={isLoading}
                    aria-invalid={emailShowError ? 'true' : 'false'}
                    aria-describedby={
                      emailShowError ? 'email-error' : undefined
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        document.getElementById('password')?.focus()
                      }
                    }}
                    className={cn(
                      'h-13 pl-11 pr-10 text-base rounded-xl border-input bg-surface-muted text-foreground shadow-[inset_0_1px_2px_rgb(0,0,0,0.03)] transition-all duration-200 ease-out',
                      'placeholder:text-muted-foreground/70',
                      emailShowValid &&
                        'border-success/40 focus-visible:ring-success/20',
                      emailShowError &&
                        'border-destructive/40 focus-visible:ring-destructive/20',
                      isLoading && 'opacity-60'
                    )}
                    {...register('email')}
                  />
                  {/* Indicador de validación */}
                  <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    {emailHasValue && (
                      <span className="inline-flex items-center animate-fade-in">
                        {emailShowValid ? (
                          <CheckCircle2 className="h-[1.1rem] w-[1.1rem] text-success" />
                        ) : emailShowError ? (
                          <AlertCircle className="h-[1.1rem] w-[1.1rem] text-destructive" />
                        ) : null}
                      </span>
                    )}
                  </div>
                </div>
                {emailShowError && errors.email && (
                  <p
                    id="email-error"
                    className="text-xs text-destructive animate-fade-in leading-snug"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              {/* Password input con icono */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-[0.8125rem] font-semibold text-foreground tracking-wide"
                >
                  Contraseña
                </Label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <Lock className="h-[1.1rem] w-[1.1rem]" aria-hidden="true" />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    disabled={isLoading}
                    aria-invalid={passwordShowError ? 'true' : 'false'}
                    aria-describedby={
                      passwordShowError ? 'password-error' : undefined
                    }
                    className={cn(
                      'h-13 pl-11 pr-12 text-base rounded-xl border-input bg-surface-muted text-foreground shadow-[inset_0_1px_2px_rgb(0,0,0,0.03)] transition-all duration-200 ease-out',
                      'placeholder:text-muted-foreground/70',
                      passwordShowError &&
                        'border-destructive/40 focus-visible:ring-destructive/20',
                      isLoading && 'opacity-60'
                    )}
                    {...register('password')}
                  />
                  {/* Toggle mostrar/ocultar */}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-[2.6rem] w-[2.6rem] rounded-xl text-muted-foreground hover:text-foreground hover:bg-surface-hover active:bg-surface-active"
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-[1.15rem] w-[1.15rem] shrink-0" />
                    ) : (
                      <Eye className="h-[1.15rem] w-[1.15rem] shrink-0" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    className="text-xs text-destructive animate-fade-in leading-snug"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              {/* Recordarme */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none group pt-0.5">
                <Input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    const next = e.target.checked
                    setRememberMe(next)
                    localStorage.setItem('auth.rememberMe', String(next))
                  }}
                  className="h-[1.15rem] w-[1.15rem] rounded-md border-border-subtle bg-surface-muted text-primary-text shadow-none focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors"
                  disabled={isLoading}
                />
                <span className="text-[0.8125rem] text-muted-foreground group-hover:text-foreground transition-colors">
                  Mantener sesión iniciada
                </span>
              </label>

              {/* CTA Primario */}
              <Button
                type="submit"
                className={cn(
                  'h-13 w-full mt-2 text-[0.9375rem] font-bold tracking-tight rounded-xl shadow-[0_4px_14px_rgb(0,0,0,0.08)] dark:shadow-[0_4px_14px_rgb(0,0,0,0.25)] transition-all duration-200 ease-out',
                  'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_6px_20px_rgb(0,0,0,0.12)] active:scale-[0.99] active:shadow-none',
                  isLoading && 'opacity-80'
                )}
                disabled={isLoading}
                aria-label="Iniciar sesión"
              >
                {isLoading ? (
                  <span className="inline-flex items-center gap-2.5">
                    <Loader2 className="h-[1.1rem] w-[1.1rem] animate-spin shrink-0" />
                    <span>Iniciando sesión...</span>
                  </span>
                ) : (
                  'Iniciar sesión'
                )}
              </Button>
            </form>

            <p className="mt-3 text-center text-xs text-muted-foreground">
              ¿Olvidaste tu contraseña? Pídele a tu administrador que la restablezca.
            </p>
          </div>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            ¿Quieres conocer la aplicación?{' '}
            <Link
              to="/planes"
              className="font-semibold text-primary-text underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Ver planes
            </Link>
          </p>

          {/* Pie de página — restringido, sin enlaces de registro */}
          <div className="mt-5 text-center">
            <p className="text-[0.6875rem] text-subtle-foreground tracking-wide leading-relaxed">
              Sistema de acceso restringido. Solo administradores autorizados.
            </p>
            <p className="mt-2 text-[0.6875rem] text-subtle-foreground">
              {APP_NAME} © {new Date().getFullYear()}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
