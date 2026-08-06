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
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Satellite } from 'lucide-react'

const loginSchema = z.object({
  email: z.string()
    .min(1, 'El correo es requerido')
    .email('Correo inválido'),
  password: z.string()
    .min(1, 'La contraseña es requerida')
    .min(8, 'Mínimo 8 caracteres'),
})

type LoginForm = z.infer<typeof loginSchema>

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { setTokens, setUser, user } = useAuthStore()
  
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [rememberMe, setRememberMe] = useState(true)
  const [showSuccess, setShowSuccess] = useState(false)
  const [shakeError, setShakeError] = useState(false)
  
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/'
  
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
  const emailShowError = emailHasValue && !emailIsValid && (touchedFields.email || isSubmitted)
  const emailShowValid = emailHasValue && emailIsValid
  
  const passwordHasValue = passwordValue.length > 0
  const passwordIsValid = passwordValue.length >= 8
  const passwordShowError = passwordHasValue && !passwordIsValid && (touchedFields.password || isSubmitted)
  const passwordShowValid = passwordHasValue && passwordIsValid
  
  useEffect(() => {
    const emailInput = document.getElementById('email')
    emailInput?.focus()
  }, [])
  
  const triggerShake = () => {
    setShakeError(true)
    setTimeout(() => setShakeError(false), 500)
  }
  
  const onSubmit = async (data: LoginForm) => {
    setError(null)
    setIsLoading(true)
    
    try {
      const response = await authApi.login(data)
      setTokens(response.accessToken, response.refreshToken)
      setUser(response.user)
      
      setShowSuccess(true)
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 800)
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
  
  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="text-center animate-fade-slide-up">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="h-8 w-8 text-success shrink-0" />
          </div>
          <p className="text-lg font-medium text-foreground">
            ¡Bienvenido{user?.name ? `, ${user.name}` : ''}!
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Redirigiendo...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-8">
      <div className={cn(
        "w-full max-w-[420px] animate-fade-slide-up",
        shakeError && "animate-shake"
      )}>
        <div className="text-center mb-8">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-lg shadow-primary/20">
            <Satellite className="h-7 w-7 text-primary-foreground shrink-0" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            AR SYSTEM
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Administra tus clientes, suscripciones y pagos desde un solo lugar
          </p>
        </div>
        
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-foreground">Iniciar sesión</h2>
            <p className="text-sm text-muted-foreground">Accede a tu cuenta</p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {error && (
              <div className="flex items-start gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive animate-fade-in">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">
                Correo electrónico
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  autoFocus
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      document.getElementById('password')?.focus()
                    }
                  }}
                  className={cn(
                    "h-12 pl-4 pr-10 text-base transition-all duration-200",
                    emailShowValid && "border-success/50 focus-visible:ring-success/30",
                    emailShowError && "border-destructive/50 focus-visible:ring-destructive/30",
                    isLoading && "opacity-60"
                  )}
                  {...register('email')}
                />
                {emailHasValue && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    {emailShowValid && (
                      <CheckCircle2 className="h-5 w-5 text-success animate-fade-in shrink-0" />
                    )}
                    {emailShowError && (
                      <AlertCircle className="h-5 w-5 text-destructive animate-fade-in shrink-0" />
                    )}
                  </div>
                )}
              </div>
              {emailShowError && errors.email && (
                <p className="text-xs text-destructive animate-fade-in">{errors.email.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                  className={cn(
                    "h-12 pl-4 pr-12 text-base transition-all duration-200",
                    passwordShowValid && "border-success/50 focus-visible:ring-success/30",
                    passwordShowError && "border-destructive/50 focus-visible:ring-destructive/30",
                    isLoading && "opacity-60"
                  )}
                  {...register('password')}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 h-12 w-12 text-muted-foreground hover:text-foreground hover:bg-transparent"
                  tabIndex={-1}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 shrink-0" />
                  ) : (
                    <Eye className="h-5 w-5 shrink-0" />
                  )}
                </Button>
              </div>
              {passwordShowError && errors.password && (
                <p className="text-xs text-destructive animate-fade-in">{errors.password.message}</p>
              )}
              {passwordHasValue && !passwordIsValid && !passwordShowError && (
                <p className="text-xs text-muted-foreground">Debe tener al menos 8 caracteres</p>
              )}
            </div>
            
            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <Input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded border-border accent-primary p-0 shadow-none"
                  disabled={isLoading}
                />
                <span className="text-sm text-muted-foreground">Mantener sesión</span>
              </label>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm text-primary hover:text-primary/80"
                disabled={isLoading}
              >
                ¿Olvidaste tu contraseña?
              </Button>
            </div>
            
            <Button
              type="submit"
              className={cn(
                "h-12 w-full text-base font-medium transition-all duration-200",
                isLoading && "opacity-80"
              )}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                  Iniciando sesión...
                </>
              ) : (
                'Iniciar sesión'
              )}
            </Button>
          </form>
        </div>
        
        <p className="mt-6 text-center text-xs text-muted-foreground">
          AR System © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
