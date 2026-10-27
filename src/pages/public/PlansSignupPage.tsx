import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Check, LoaderCircle, MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TurnstileWidget } from '@/components/public/TurnstileWidget'
import { isCaptchaEnabled, TURNSTILE_SITE_KEY } from '@/lib/turnstile'
import { useBusinessPlans } from '@/hooks/useOrganizationPlanPaymentReports'
import {
  useCreatePlanQuoteRequest,
  usePublicPaymentInstructions,
  usePublicSignup,
} from '@/hooks/usePublicPlans'
import {
  getCatalogItem,
  getPlanLabel,
} from '@/lib/business-plan-catalog'
import { DEFAULT_TRIAL_DAYS, getWhatsAppUrl } from '@/lib/business-plan'
import { formatCurrency, formatDate } from '@/lib/constants'
import { getErrorHandler } from '@/lib/error-handler'
import { useAuthStore } from '@/stores/auth.store'
import type {
  ApiError,
  PublicPaymentInstructions,
  PublicSignupPaymentMethod,
  PublicSignupResponse,
} from '@/types/api'

type PublicPlanKey = 'basico' | 'pro' | 'negocio' | 'a-medida'
type SignupPlanKey = 'basico' | 'pro' | 'negocio'

const PLAN_QUERY_KEYS: PublicPlanKey[] = ['basico', 'pro', 'negocio', 'a-medida']

const signupSchema = z
  .object({
    organizationName: z.string().trim().min(1, 'El nombre de la organización es requerido').max(120),
    adminName: z.string().trim().min(1, 'Tu nombre es requerido').max(120),
    email: z.string().trim().min(1, 'El correo es requerido').email('Correo inválido'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[a-zA-Z]/, 'Debe incluir letras')
      .regex(/\d/, 'Debe incluir números'),
    confirmPassword: z.string().min(1, 'Confirma tu contraseña'),
    phone: z
      .string()
      .trim()
      .regex(/^\+?[\d\s-]{10,16}$/, 'Teléfono inválido')
      .optional()
      .or(z.literal('')),
    method: z.enum(['transferencia', 'usdt']).optional(),
    reference: z.string().trim().max(120, 'Máximo 120 caracteres').optional(),
    notes: z.string().trim().max(500, 'Máximo 500 caracteres').optional(),
    accepted: z.boolean(),
  })
  .superRefine((data, context) => {
    if (data.password !== data.confirmPassword) {
      context.addIssue({
        code: 'custom',
        path: ['confirmPassword'],
        message: 'Las contraseñas no coinciden',
      })
    }
  })

type SignupForm = z.infer<typeof signupSchema>

const quoteSchema = z.object({
  name: z.string().trim().min(1, 'Tu nombre es requerido').max(120),
  organizationName: z.string().trim().max(120).optional().or(z.literal('')),
  email: z.string().trim().min(1, 'El correo es requerido').email('Correo inválido'),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{10,16}$/, 'Teléfono inválido')
    .optional()
    .or(z.literal('')),
  estimatedClients: z
    .number({ invalid_type_error: 'Indica un número de clientes' })
    .int('Debe ser un número entero')
    .positive('Debe ser mayor que cero'),
  message: z.string().trim().max(1000, 'Máximo 1000 caracteres').optional().or(z.literal('')),
})

type QuoteForm = z.infer<typeof quoteSchema>

const FIELD_BY_ERROR: Record<string, keyof SignupForm> = {
  EMAIL_TAKEN: 'email',
  INVALID_EMAIL: 'email',
  WEAK_PASSWORD: 'password',
  INVALID_PHONE: 'phone',
  INVALID_PAYMENT_METHOD: 'method',
}

function isSignupPlan(value: string | null): value is SignupPlanKey {
  return value === 'basico' || value === 'pro' || value === 'negocio'
}

function availableMethods(instructions: PublicPaymentInstructions | undefined): PublicSignupPaymentMethod[] {
  if (!instructions) return []
  const methods: PublicSignupPaymentMethod[] = []
  if (instructions.bankTransfer) methods.push('transferencia')
  if (instructions.usdt) methods.push('usdt')
  return methods
}

function PaymentInstructions({ instructions }: { instructions: PublicPaymentInstructions }) {
  return (
    <div className="space-y-3">
      {instructions.bankTransfer && (
        <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm">
          <p className="font-semibold">Transferencia bancaria</p>
          <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Banco</dt>
              <dd className="font-medium">{instructions.bankTransfer.bankName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Titular</dt>
              <dd className="font-medium">{instructions.bankTransfer.accountHolder}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Cuenta</dt>
              <dd className="break-all font-medium">
                {instructions.bankTransfer.accountNumber} · {instructions.bankTransfer.accountType}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">RIF</dt>
              <dd className="font-medium">{instructions.bankTransfer.rif}</dd>
            </div>
          </dl>
          {instructions.bankTransfer.notes && (
            <p className="mt-2 text-xs text-muted-foreground">{instructions.bankTransfer.notes}</p>
          )}
        </div>
      )}
      {instructions.usdt && (
        <div className="rounded-xl border border-border bg-surface-muted p-4 text-sm">
          <p className="font-semibold">USDT</p>
          <dl className="mt-2 grid grid-cols-1 gap-1 sm:grid-cols-2">
            <div>
              <dt className="text-muted-foreground">Red</dt>
              <dd className="font-medium">{instructions.usdt.network}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dirección</dt>
              <dd className="break-all font-medium">{instructions.usdt.address}</dd>
            </div>
          </dl>
          {instructions.usdt.notes && (
            <p className="mt-2 text-xs text-muted-foreground">{instructions.usdt.notes}</p>
          )}
        </div>
      )}
    </div>
  )
}

function PlanSelectionSummary({
  planLabel,
  price,
  trialDays,
  clientLimit,
  adminLimit,
  isPaid,
}: {
  planLabel: string
  price: number | null
  trialDays: number
  clientLimit: number | null
  adminLimit: number | null
  isPaid: boolean
}) {
  const features = [
    clientLimit === null ? 'Clientes a medida' : `Hasta ${clientLimit} clientes`,
    adminLimit === null
      ? 'Administradores a medida'
      : adminLimit === 1
        ? '1 administrador'
        : `Hasta ${adminLimit} administradores`,
    'WhatsApp incluido',
    'Portal de consulta para tus clientes',
  ]

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-surface to-surface-muted">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/70 p-5">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Tu selección
          </p>
          <p className="mt-1 text-2xl font-bold">{planLabel}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isPaid ? 'Plan mensual para tu organización' : 'Prueba gratis para tu organización'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold">
            {price === null ? '—' : formatCurrency(price)}
            <span className="ml-1 text-sm font-medium text-muted-foreground">/mes</span>
          </p>
          <p className="mt-1 text-xs font-medium text-success">
            {isPaid
              ? `Básico de prueba por ${trialDays} días`
              : `${trialDays} días gratis`}
          </p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 p-5 sm:grid-cols-2">
        {features.map((feature) => (
          <div
            key={feature}
            className="flex items-start gap-2 rounded-lg border border-border/60 bg-surface/70 px-3 py-2 text-sm"
          >
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span>{feature}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PlansSignupPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const setTokens = useAuthStore((state) => state.setTokens)
  const setUser = useAuthStore((state) => state.setUser)
  const requestedPlan = searchParams.get('plan')
  const plan: PublicPlanKey =
    requestedPlan && PLAN_QUERY_KEYS.includes(requestedPlan as PublicPlanKey)
      ? (requestedPlan as PublicPlanKey)
      : 'basico'
  const isQuote = plan === 'a-medida'
  const signupPlan: SignupPlanKey = isSignupPlan(plan) ? plan : 'basico'
  const isPaid = signupPlan === 'pro' || signupPlan === 'negocio'

  const { data: catalogData } = useBusinessPlans()
  const planItem = getCatalogItem(catalogData?.plans, signupPlan)
  const planLabel = getPlanLabel(catalogData?.plans, signupPlan)
  const trialDays = catalogData?.plans.find((item) => item.key === 'basico')?.trialDays ?? DEFAULT_TRIAL_DAYS
  const price = planItem?.priceUsdMonthly ?? null
  const { data: instructions, isLoading: instructionsLoading } = usePublicPaymentInstructions()
  const methods = useMemo(() => availableMethods(instructions), [instructions])
  const paymentUnavailable = isPaid && !instructionsLoading && methods.length === 0
  const signupMutation = usePublicSignup()
  const quoteMutation = useCreatePlanQuoteRequest()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [captchaReset, setCaptchaReset] = useState(0)
  const [signupResult, setSignupResult] = useState<PublicSignupResponse | null>(null)
  const [quoteSent, setQuoteSent] = useState(false)

  const signupForm = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      organizationName: '',
      adminName: '',
      email: '',
      password: '',
      confirmPassword: '',
      phone: '',
      method: 'transferencia',
      reference: '',
      notes: '',
      accepted: false,
    },
  })

  const quoteForm = useForm<QuoteForm>({
    resolver: zodResolver(quoteSchema),
    defaultValues: {
      name: '',
      organizationName: '',
      email: '',
      phone: '',
      estimatedClients: undefined as unknown as number,
      message: '',
    },
  })

  useEffect(() => {
    if (!isPaid) return
    const current = signupForm.getValues('method')
    if (methods.length > 0 && (!current || !methods.includes(current))) {
      signupForm.setValue('method', methods[0])
    }
  }, [isPaid, methods, signupForm])

  const method = signupForm.watch('method')
  const accepted = signupForm.watch('accepted')
  const selectedMethod = method && methods.includes(method) ? method : methods[0] ?? undefined

  const total = useMemo(() => (price === null ? null : price), [price])
  const whatsappUrl = getWhatsAppUrl('Hola, quiero cotizar un plan a medida de A|R SYSTEM')

  const goToPayment = async () => {
    const valid = await signupForm.trigger([
      'organizationName',
      'adminName',
      'email',
      'password',
      'confirmPassword',
      'phone',
    ])
    if (valid) setStep(2)
  }

  const goToConfirm = async () => {
    if (isPaid) {
      if (paymentUnavailable || !selectedMethod) return
      const reference = signupForm.getValues('reference')?.trim()
      if (!reference) {
        signupForm.setError('reference', {
          type: 'manual',
          message: 'Indica la referencia o hash del pago',
        })
        return
      }
      const valid = await signupForm.trigger(['method', 'reference', 'notes'])
      if (!valid) return
    }
    setStep(3)
  }

  const onSignupSubmit = async (data: SignupForm) => {
    if (isCaptchaEnabled && !captchaToken) return
    if (isPaid) {
      if (!selectedMethod || !data.reference?.trim()) {
        signupForm.setError('reference', {
          type: 'manual',
          message: 'Indica la referencia o hash del pago',
        })
        return
      }
      if (paymentUnavailable) return
    }
    try {
      const response = await signupMutation.mutateAsync({
        plan: signupPlan,
        organization: { name: data.organizationName.trim() },
        admin: {
          name: data.adminName.trim(),
          email: data.email.trim(),
          password: data.password,
          phone: data.phone?.trim() || undefined,
        },
        ...(isPaid && selectedMethod
          ? {
              payment: {
                method: selectedMethod,
                reference: data.reference!.trim(),
                notes: data.notes?.trim() || undefined,
              },
            }
          : {}),
        turnstileToken: captchaToken ?? undefined,
      })
      setSignupResult(response)
      setTokens(response.accessToken, response.refreshToken, 'local')
      setUser(response.user)
      setStep(3)
    } catch (error) {
      const apiError = error as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      const field = apiError.code ? FIELD_BY_ERROR[apiError.code] : undefined
      if (field) {
        signupForm.setError(field, {
          type: 'manual',
          message: handler?.message || apiError.message || 'Revisa este campo',
        })
        if (field === 'email' || field === 'password' || field === 'phone') setStep(1)
        if (field === 'method') setStep(2)
      } else {
        signupForm.setError('root', {
          type: 'manual',
          message: handler?.message || apiError.message || 'No pudimos crear tu cuenta',
        })
      }
      setCaptchaToken(null)
      setCaptchaReset((value) => value + 1)
    }
  }

  const onQuoteSubmit = async (data: QuoteForm) => {
    if (isCaptchaEnabled && !captchaToken) return
    try {
      await quoteMutation.mutateAsync({
        name: data.name.trim(),
        email: data.email.trim(),
        phone: data.phone?.trim() || undefined,
        organizationName: data.organizationName?.trim() || undefined,
        estimatedClients: data.estimatedClients,
        message: data.message?.trim() || undefined,
        turnstileToken: captchaToken ?? undefined,
      })
      setQuoteSent(true)
    } catch (error) {
      const apiError = error as Partial<ApiError>
      const handler = apiError.code ? getErrorHandler(apiError.code) : undefined
      const field =
        apiError.code === 'INVALID_EMAIL'
          ? 'email'
          : apiError.code === 'INVALID_PHONE'
            ? 'phone'
            : undefined
      if (field) {
        quoteForm.setError(field, {
          type: 'manual',
          message: handler?.message || 'Revisa este campo',
        })
      } else {
        quoteForm.setError('root', {
          type: 'manual',
          message: handler?.message || apiError.message || 'No pudimos enviar la solicitud',
        })
      }
      setCaptchaToken(null)
      setCaptchaReset((value) => value + 1)
    }
  }

  if (signupResult) {
    const formValues = signupForm.getValues()
    const trialEnd = signupResult.organization.trialEndsAt
      ? formatDate(signupResult.organization.trialEndsAt)
      : null
    return (
      <div className="min-h-screen bg-background px-4 py-12 text-foreground">
        <div className="mx-auto max-w-xl space-y-4">
          <Card className="rounded-2xl border border-border bg-surface">
            <CardContent className="space-y-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15">
                <Check className="h-6 w-6 text-success" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Tu cuenta está lista</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                  Entra con {formValues.email} a tu nueva organización.
                </p>
              </div>
              {isPaid ? (
                <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
                  <p className="font-semibold">Pago en verificación</p>
                  <p className="mt-1 text-muted-foreground">
                    Tu plan {planLabel} se activará cuando aprobemos el pago. Mientras tanto tienes
                    Básico de prueba{trialEnd ? ` hasta el ${trialEnd}` : ''}.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
                  <p className="font-semibold">Prueba gratis activa</p>
                  <p className="mt-1 text-muted-foreground">
                    Tu prueba termina el {trialEnd ?? `en ${trialDays} días`}.
                  </p>
                </div>
              )}
              <Button className="w-full" onClick={() => navigate('/dashboard')}>
                Entrar al panel
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background px-4 py-10 text-foreground">
      <div className="mx-auto max-w-2xl space-y-5">
        <div className="flex items-center justify-between gap-3">
          <Link to="/planes" className="font-bold tracking-wide">
            A<span className="text-secondary">|</span>R SYSTEM
          </Link>
          <Link to="/login" className="text-sm text-muted-foreground hover:underline">
            Iniciar sesión
          </Link>
        </div>

        <div>
          <h1 className="text-3xl font-bold">
            {isQuote ? 'Solicitar cotización' : `Empezar con ${planLabel}`}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isQuote
              ? 'Cuéntanos cuántos clientes gestionas y te contactamos con una propuesta.'
              : isPaid
                ? 'Crea tu organización, reporta el pago y empieza con Básico de prueba mientras lo verificamos.'
                : `Crea tu organización y usa el plan Básico gratis durante ${trialDays} días.`}
          </p>
        </div>

        {isQuote ? (
          <Card className="rounded-2xl border border-border bg-surface">
            <CardContent className="p-5">
              {quoteSent ? (
                <div className="space-y-3 py-4 text-center">
                  <Check className="mx-auto h-8 w-8 text-success" />
                  <p className="font-semibold">Solicitud enviada. Te contactaremos para cotizar.</p>
                  <p className="text-sm text-muted-foreground">
                    Si prefieres, escríbenos por WhatsApp.
                  </p>
                  {whatsappUrl && (
                    <Button asChild variant="outline">
                      <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                        <MessageCircle className="mr-2 h-4 w-4" />
                        Abrir WhatsApp
                      </a>
                    </Button>
                  )}
                </div>
              ) : (
                <form
                  onSubmit={quoteForm.handleSubmit(onQuoteSubmit)}
                  className="space-y-4"
                  noValidate
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="quote-name">Tu nombre *</Label>
                      <Input id="quote-name" autoComplete="name" {...quoteForm.register('name')} />
                      {quoteForm.formState.errors.name && (
                        <p className="text-sm text-destructive">
                          {quoteForm.formState.errors.name.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quote-org">Organización</Label>
                      <Input
                        id="quote-org"
                        autoComplete="organization"
                        {...quoteForm.register('organizationName')}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quote-email">Correo *</Label>
                      <Input
                        id="quote-email"
                        type="email"
                        autoComplete="email"
                        {...quoteForm.register('email')}
                      />
                      {quoteForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {quoteForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quote-phone">Teléfono</Label>
                      <Input
                        id="quote-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+58 412 1234567"
                        {...quoteForm.register('phone')}
                      />
                      {quoteForm.formState.errors.phone && (
                        <p className="text-sm text-destructive">
                          {quoteForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="quote-clients">Clientes estimados *</Label>
                      <Input
                        id="quote-clients"
                        type="number"
                        min={1}
                        step={1}
                        {...quoteForm.register('estimatedClients', { valueAsNumber: true })}
                      />
                      {quoteForm.formState.errors.estimatedClients && (
                        <p className="text-sm text-destructive">
                          {quoteForm.formState.errors.estimatedClients.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="quote-message">Mensaje</Label>
                      <textarea
                        id="quote-message"
                        rows={3}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Cuéntanos qué necesitas"
                        {...quoteForm.register('message')}
                      />
                      {quoteForm.formState.errors.message && (
                        <p className="text-sm text-destructive">
                          {quoteForm.formState.errors.message.message}
                        </p>
                      )}
                    </div>
                  </div>

                  {isCaptchaEnabled && (
                    <TurnstileWidget
                      siteKey={TURNSTILE_SITE_KEY}
                      action="public_quote"
                      onToken={setCaptchaToken}
                      resetSignal={captchaReset}
                    />
                  )}

                  {quoteForm.formState.errors.root && (
                    <p className="text-sm text-destructive">
                      {quoteForm.formState.errors.root.message}
                    </p>
                  )}

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={
                      quoteMutation.isPending ||
                      (isCaptchaEnabled && !captchaToken)
                    }
                  >
                    {quoteMutation.isPending ? 'Enviando...' : 'Enviar solicitud'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border border-border bg-surface">
            <CardContent className="space-y-5 p-5">
              <div className="flex items-center gap-2 text-sm">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <span
                      className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                        step >= item
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-surface-muted text-muted-foreground'
                      }`}
                    >
                      {item}
                    </span>
                    <span className="text-muted-foreground">
                      {item === 1 ? 'Datos' : item === 2 ? 'Pago' : 'Confirmar'}
                    </span>
                    {item < 3 && <span className="mx-1 h-px w-4 bg-border" />}
                  </div>
                ))}
              </div>

              <form onSubmit={signupForm.handleSubmit(onSignupSubmit)} noValidate>
                {step === 1 && (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="signup-org">Nombre de la organización *</Label>
                      <Input
                        id="signup-org"
                        autoComplete="organization"
                        placeholder="Ej. Mi ISP"
                        {...signupForm.register('organizationName')}
                      />
                      {signupForm.formState.errors.organizationName && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.organizationName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="signup-name">Tu nombre *</Label>
                      <Input id="signup-name" autoComplete="name" {...signupForm.register('adminName')} />
                      {signupForm.formState.errors.adminName && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.adminName.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="signup-email">Correo *</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        autoComplete="email"
                        {...signupForm.register('email')}
                      />
                      {signupForm.formState.errors.email && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Contraseña *</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        autoComplete="new-password"
                        placeholder="Mínimo 8, con letras y números"
                        {...signupForm.register('password')}
                      />
                      {signupForm.formState.errors.password && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm">Confirmar contraseña *</Label>
                      <Input
                        id="signup-confirm"
                        type="password"
                        autoComplete="new-password"
                        {...signupForm.register('confirmPassword')}
                      />
                      {signupForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                      <Label htmlFor="signup-phone">Teléfono (opcional)</Label>
                      <Input
                        id="signup-phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="+58 412 1234567"
                        {...signupForm.register('phone')}
                      />
                      {signupForm.formState.errors.phone && (
                        <p className="text-sm text-destructive">
                          {signupForm.formState.errors.phone.message}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <PlanSelectionSummary
                      planLabel={planLabel}
                      price={total}
                      trialDays={trialDays}
                      clientLimit={planItem?.clientLimit ?? null}
                      adminLimit={planItem?.adminLimit ?? null}
                      isPaid={isPaid}
                    />
                    {isPaid ? (
                      <>
                        <div className="rounded-xl border border-info/20 bg-info/10 p-4 text-sm">
                          <p className="font-semibold">Pago de 1 mes de {planLabel}</p>
                          <p className="mt-1 text-muted-foreground">
                            Monto a pagar: {total === null ? '—' : formatCurrency(total)}. Reporta el
                            pago y lo verificamos.
                          </p>
                        </div>
                        {instructionsLoading ? (
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <LoaderCircle className="h-4 w-4 animate-spin" />
                            Cargando datos de pago...
                          </p>
                        ) : paymentUnavailable || !instructions ? (
                          <div className="rounded-xl border border-warning/30 bg-warning/10 p-4 text-sm">
                            <p className="font-semibold">Datos de pago no disponibles</p>
                            <p className="mt-1 text-muted-foreground">
                              No pudimos cargar los métodos de pago. Puedes empezar con Básico gratis
                              o escribirnos para coordinar el pago.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button asChild variant="outline" size="sm">
                                <Link to="/planes/solicitar?plan=basico">Empezar con Básico</Link>
                              </Button>
                              {whatsappUrl && (
                                <Button asChild variant="outline" size="sm">
                                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                                    <MessageCircle className="mr-2 h-4 w-4" />
                                    WhatsApp
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <>
                            <PaymentInstructions instructions={instructions} />
                            <div className="space-y-2">
                              <Label>Método de pago *</Label>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                {methods.map((value) => (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() =>
                                      signupForm.setValue('method', value, { shouldValidate: true })
                                    }
                                    className={`rounded-lg border p-3 text-left text-sm transition-colors ${
                                      selectedMethod === value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border bg-surface hover:bg-surface-muted'
                                    }`}
                                  >
                                    <span className="font-medium">
                                      {value === 'transferencia' ? 'Transferencia' : 'USDT'}
                                    </span>
                                  </button>
                                ))}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-reference">Referencia o hash *</Label>
                              <Input
                                id="signup-reference"
                                placeholder="Número de referencia o hash de la transacción"
                                {...signupForm.register('reference')}
                              />
                              {signupForm.formState.errors.reference && (
                                <p className="text-sm text-destructive">
                                  {signupForm.formState.errors.reference.message}
                                </p>
                              )}
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="signup-notes">Nota (opcional)</Label>
                              <Input
                                id="signup-notes"
                                placeholder="Detalle adicional"
                                {...signupForm.register('notes')}
                              />
                              {signupForm.formState.errors.notes && (
                                <p className="text-sm text-destructive">
                                  {signupForm.formState.errors.notes.message}
                                </p>
                              )}
                            </div>
                          </>
                        )}
                      </>
                    ) : (
                      <div className="rounded-2xl border border-success/25 bg-gradient-to-br from-success/10 via-surface to-surface p-5">
                        <div className="flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-success/15">
                            <Check className="h-5 w-5 text-success" />
                          </div>
                          <div>
                            <p className="text-base font-semibold">Sin pago hoy</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              Activas {trialDays} días de prueba con todas las funciones del plan
                              Básico. No pedimos tarjeta ni pago por adelantado; al terminar eliges
                              cómo continuar.
                            </p>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {[
                            'No pedimos tarjeta',
                            'Sin compromiso de permanencia',
                            'Tus datos quedan guardados',
                            'Puedes cambiar de plan después',
                          ].map((item) => (
                            <div
                              key={item}
                              className="flex items-start gap-2 rounded-lg border border-success/15 bg-surface/70 px-3 py-2 text-sm"
                            >
                              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                              <span>{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-4 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Plan</span>
                        <span className="font-semibold">{planLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Precio mensual</span>
                        <span className="font-semibold">
                          {total === null ? '—' : formatCurrency(total)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Organización</span>
                        <span className="font-semibold">
                          {signupForm.getValues('organizationName')}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Administrador</span>
                        <span className="font-semibold">{signupForm.getValues('email')}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Prueba Básico</span>
                        <span className="font-semibold">{trialDays} días</span>
                      </div>
                      {isPaid && selectedMethod && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">Pago reportado</span>
                          <span className="font-semibold">
                            {selectedMethod === 'transferencia' ? 'Transferencia' : 'USDT'}
                          </span>
                        </div>
                      )}
                    </div>

                    <label className="flex items-start gap-2 text-sm">
                      <input
                        type="checkbox"
                        className="mt-1 h-4 w-4"
                        checked={accepted}
                        onChange={(event) =>
                          signupForm.setValue('accepted', event.target.checked, {
                            shouldValidate: true,
                          })
                        }
                      />
                      <span>
                        Confirmo que los datos son correctos y acepto que el plan Pro o Negocio se
                        activa cuando se apruebe el pago.
                      </span>
                    </label>
                    {!accepted && signupForm.formState.isSubmitted && (
                      <p className="text-sm text-destructive">Marca la confirmación para continuar.</p>
                    )}
                  </div>
                )}

                {isCaptchaEnabled && step === 3 && (
                  <div className="mt-4">
                    <TurnstileWidget
                      siteKey={TURNSTILE_SITE_KEY}
                      action="public_signup"
                      onToken={setCaptchaToken}
                      resetSignal={captchaReset}
                    />
                  </div>
                )}

                {signupForm.formState.errors.root && (
                  <p className="mt-3 text-sm text-destructive">
                    {signupForm.formState.errors.root.message}
                  </p>
                )}

                <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="sm:flex-1"
                      onClick={() => setStep((value) => (value - 1) as 1 | 2 | 3)}
                      disabled={signupMutation.isPending}
                    >
                      Volver
                    </Button>
                  )}
                  {step === 1 && (
                    <Button type="button" className="w-full" onClick={goToPayment}>
                      Continuar
                    </Button>
                  )}
                  {step === 2 && (
                    <Button
                      type="button"
                      className="w-full sm:flex-1"
                      onClick={goToConfirm}
                      disabled={isPaid && (paymentUnavailable || !selectedMethod)}
                    >
                      Continuar
                    </Button>
                  )}
                  {step === 3 && (
                    <Button
                      type="submit"
                      className="w-full sm:flex-1"
                      disabled={
                        signupMutation.isPending ||
                        !accepted ||
                        (isCaptchaEnabled && !captchaToken)
                      }
                    >
                      {signupMutation.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <p className="text-center text-xs text-muted-foreground">
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="underline underline-offset-4">
            Inicia sesión
          </Link>
        </p>
      </div>
    </div>
  )
}
