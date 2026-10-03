import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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
  Fingerprint,
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
    .min(1, 'La contraseña es requerida')
    .min(8, 'Mínimo 8 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setTokens, setUser, user } = useAuthStore()
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'

  useEffect(() => {
    if (isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, from, navigate])

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(
    () => localStorage.getItem('auth.rememberMe') !== 'false'
  )
  const [showSuccess, setShowSuccess] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  const [biometricAvailable] = useState(true)
  const [biometricPending, setBiometricPending] = useState(false)

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
  const passwordValue = watch('password', '')

  const emailHasValue = emailValue.length > 0
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)
  const emailShowError =
    emailHasValue && !emailIsValid && (touchedFields.email || isSubmitted)
  const emailShowValid = emailHasValue && emailIsValid

  const passwordHasValue = passwordValue.length > 0
  const passwordIsValid = passwordValue.length >= 8
  const passwordShowError =
    passwordHasValue && !passwordIsValid && (touchedFields.password || isSubmitted)
  const passwordShowValid = passwordHasValue && passwordIsValid

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
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 900)
    } catch (err) {
      const apiError = err as ApiError
      if (apiError.code === 'INVALID_CREDENTIALS') {
        setError('Correo o contraseña incorrectos')
      } else {
        setError('Error al iniciar sesión. Intente nuevamente.')
      }
      triggerShake()
    } finally {
      setIsLoading(false)
    }
  }

  const handleBiometricLogin = async () => {
    setBiometricPending(true)
    try {
      // Flujo biométrico simulado: el dispositivo debe tener credenciales almacenadas.
      // Si no hay soporte nativo, se informa al usuario sin romper la experiencia.
      await new Promise((_, reject) => setTimeout(() => reject(new Error('BIOMETRIC_NOT_AVAILABLE')), 600))
    } catch {
      setError('Autenticación biométrica no disponible. Use sus credenciales.')
      triggerShake()
    } finally {
      setBiometricPending(false)
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
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-primary/10 selection:text-primary">
      {/* Branding Area — centrado, generoso espacio negativo */}
      <header className="flex flex-col items-center pt-12 pb-2 px-6">
        <a
          href="#"
          className="inline-flex items-center justify-center px-5 py-3 transition-transform hover:scale-[1.03] duration-300"
          aria-label={APP_NAME}
        >
          <BrandMark size="xl" hideSystemOnMobile={false} variant="light" />
        </a>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground leading-tight text-center">
          Bienvenido de Nuevo
        </h1>
        <p className="mt-1.5 text-xs text-muted-foreground max-w-56 text-center leading-relaxed">
          Accede con tus credenciales existentes
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
            <div className="text-center mb-5">
              <h2 className="text-base font-bold text-foreground tracking-tight">
                Iniciar sesión
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Sistema restringido para administradores
              </p>
            </div>

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
                      'h-13 pl-11 pr-10 text-[0.9375rem] rounded-xl border-input bg-surface-muted text-foreground shadow-[inset_0_1px_2px_rgb(0,0,0,0.03)] transition-all duration-200 ease-out',
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
                      'h-13 pl-11 pr-12 text-[0.9375rem] rounded-xl border-input bg-surface-muted text-foreground shadow-[inset_0_1px_2px_rgb(0,0,0,0.03)] transition-all duration-200 ease-out',
                      'placeholder:text-muted-foreground/70',
                      passwordShowValid &&
                        'border-success/40 focus-visible:ring-success/20',
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
                    tabIndex={-1}
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
                {passwordShowError && errors.password && (
                  <p
                    id="password-error"
                    className="text-xs text-destructive animate-fade-in leading-snug"
                  >
                    {errors.password.message}
                  </p>
                )}
                {passwordHasValue && !passwordIsValid && !passwordShowError && (
                  <p className="text-xs text-muted-foreground leading-snug">
                    Debe tener al menos 8 caracteres
                  </p>
                )}
              </div>

              {/* Recuperación alineada derecha */}
              <div className="flex items-center justify-end pt-0.5">
                <Button
                  type="button"
                  variant="link"
                  className="h-auto p-0 text-xs font-medium text-muted-foreground hover:text-foreground hover:no-underline transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md"
                  disabled={isLoading}
                  onClick={() => {
                    // Flujo de recuperación opcional — no crea cuenta
                    navigate('/recovery')
                  }}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </div>

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

            {/* Recordarme */}
            <div className="mt-3 flex items-center gap-2.5">
              <label className="flex items-center gap-2.5 cursor-pointer select-none group">
                <Input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => {
                    const next = e.target.checked
                    setRememberMe(next)
                    localStorage.setItem('auth.rememberMe', String(next))
                  }}
                  className="h-[1.15rem] w-[1.15rem] rounded-md border-border-subtle bg-surface-muted text-primary shadow-none focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors"
                  disabled={isLoading}
                  aria-label="Mantener sesión iniciada"
                />
                <span className="text-[0.8125rem] text-muted-foreground group-hover:text-foreground transition-colors">
                  Mantener sesión iniciada
                </span>
              </label>
            </div>
          </div>

          {/* Biometría — acceso secundario inferior */}
          {biometricAvailable && (
            <div className="mt-4">
              <div className="relative flex items-center gap-3 my-3">
                <div className="h-px flex-1 bg-border-subtle" />
                <span className="text-[0.6875rem] font-medium text-subtle-foreground uppercase tracking-wider shrink-0">
                  o continúa con
                </span>
                <div className="h-px flex-1 bg-border-subtle" />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleBiometricLogin}
                disabled={isLoading || biometricPending}
                className={cn(
                  'h-13 w-full rounded-xl border-border bg-surface text-foreground shadow-sm hover:bg-surface-hover hover:border-border-strong active:bg-surface-active active:scale-[0.99] transition-all duration-200',
                  'text-[0.9375rem] font-semibold tracking-tight',
                  (isLoading || biometricPending) && 'opacity-70'
                )}
                aria-label="Iniciar sesión con Face ID o Touch ID"
              >
                {biometricPending ? (
                  <span className="inline-flex items-center gap-2.5">
                    <Loader2 className="h-[1.1rem] w-[1.1rem] animate-spin shrink-0" />
                    <span>Verificando...</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2.5">
                    <Fingerprint className="h-[1.15rem] w-[1.15rem] text-primary" />
                    <span>Face ID / Touch ID</span>
                  </span>
                )}
              </Button>
            </div>
          )}

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
