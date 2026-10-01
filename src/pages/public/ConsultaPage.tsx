import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  usePublicCreateReport,
  usePublicLookup,
  usePublicOrganization,
} from '@/hooks/usePaymentReports'
import type { ApiError, PaymentMethod, PublicLookupResponse } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { PhoneInput } from '@/components/ui/phone-input'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BrandMark } from '@/components/brand/BrandMark'
import { ExchangeTicker } from '@/components/exchange/ExchangeTicker'
import { BsReference } from '@/components/exchange/BsReference'
import { useDolarRates } from '@/hooks/useExchange'
import { useExchangeStore } from '@/stores/exchange.store'
import { getRateForSource } from '@/lib/exchange'
import {
  SUBSCRIPTION_STATUS_COLORS,
  SUBSCRIPTION_STATUS_LABELS,
  BILLING_PERIOD_STATUS_COLORS,
  BILLING_PERIOD_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_INFO,
  STATUS_SUCCESS,
  formatCurrency,
  formatDate,
} from '@/lib/constants'
import {
  AlignLeft,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  ChevronDown,
  CreditCard,
  DollarSign,
  History,
  IdCard,
  Loader2,
  Search,
  Trash2,
  Wifi,
} from 'lucide-react'

const lookupSchema = z.object({
  dniPrefix: z.enum(['V-', 'J-']),
  dniDigits: z
    .string()
    .min(1, 'La cédula es requerida')
    .regex(/^\d{7,9}$/, 'La cédula debe tener 7 a 9 dígitos.'),
  phone: z
    .string()
    .min(1, 'El teléfono es requerido')
    .refine((v) => v.replace(/\D/g, '').length >= 10, {
      message: 'Ingresa un teléfono válido de 10 u 11 dígitos.',
    }),
})

type LookupForm = z.infer<typeof lookupSchema>

const reportSchema = (minDate: string) =>
  z.object({
    paymentMethod: z.string().min(1, 'Seleccione un método de pago'),
    paidAt: z
      .string()
      .min(1, 'Fecha de pago requerida')
      .refine((date) => !minDate || date >= minDate, {
        message: minDate ? `La fecha no puede ser anterior a ${formatDate(minDate)}` : 'Fecha inválida',
      }),
    notes: z.string().max(500, 'Máximo 500 caracteres').optional(),
  })

type ReportForm = z.infer<ReturnType<typeof reportSchema>>

const GENERIC_NOT_FOUND = 'No encontramos registros con esos datos. Verifica e intenta de nuevo.'

const CONSULTA_STORAGE_KEY = 'consulta.credentials'

interface StoredConsultaCredentials {
  dniPrefix: 'V-' | 'J-'
  dniDigits: string
  phone: string
  remember: boolean
}

function loadStoredCredentials(): StoredConsultaCredentials | null {
  try {
    const raw = localStorage.getItem(CONSULTA_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<StoredConsultaCredentials>
    if (!parsed || typeof parsed !== 'object') return null
    const dniPrefix = parsed.dniPrefix === 'J-' ? 'J-' : 'V-'
    const dniDigits = typeof parsed.dniDigits === 'string' ? parsed.dniDigits.replace(/\D/g, '').slice(0, 9) : ''
    const phone = typeof parsed.phone === 'string' ? parsed.phone : ''
    if (!/^\d{7,9}$/.test(dniDigits) || phone.replace(/\D/g, '').length < 10) return null
    return { dniPrefix, dniDigits, phone, remember: parsed.remember !== false }
  } catch {
    return null
  }
}

/** Identificador de la suscripción: cuenta + kit si existe, si no el kit completo (sin duplicar "Kit KIT-"). */
function subscriptionDisplayCode(sub: { kitNumber: string; accountNumber?: string }): string {
  const account = sub.accountNumber?.trim()
  if (account) return `Cuenta ${account} · ${sub.kitNumber}`
  return sub.kitNumber
}

export function ConsultaPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const { data: orgData, isLoading: orgLoading, isError: orgError } = usePublicOrganization(orgSlug)

  const [storedCredentials] = useState<StoredConsultaCredentials | null>(() => loadStoredCredentials())
  const [lookupResult, setLookupResult] = useState<PublicLookupResponse | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [lastCredentials, setLastCredentials] = useState<{ dni: string; phone: string } | null>(null)
  const [selectedSubscriptionId, setSelectedSubscriptionId] = useState<string | null>(null)
  const [expandedSubscriptions, setExpandedSubscriptions] = useState<Record<string, boolean>>({})
  const [rememberMe, setRememberMe] = useState(storedCredentials?.remember ?? true)
  const [rememberToast, setRememberToast] = useState<string | null>(null)

  const lookupMutation = usePublicLookup(orgSlug)
  const reportMutation = usePublicCreateReport(orgSlug)
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isDirty },
  } = useForm<LookupForm>({
    resolver: zodResolver(lookupSchema),
    defaultValues: storedCredentials
      ? { dniPrefix: storedCredentials.dniPrefix, dniDigits: storedCredentials.dniDigits, phone: storedCredentials.phone }
      : { dniPrefix: 'V-', dniDigits: '', phone: '' },
    mode: 'onChange',
  })
  const phoneValue = watch('phone', '')
  const dniPrefix = watch('dniPrefix', 'V-')
  const dniDigits = watch('dniDigits', '')
  const dniInputRef = useRef<HTMLInputElement | null>(null)

  const phoneNationalDigits = phoneValue.replace(/\D/g, '').replace(/^58/, '').replace(/^0/, '')
  const phoneIsValid = phoneValue.replace(/\D/g, '').length >= 10
  const dniIsValid = /^\d{7,9}$/.test(dniDigits)
  const canSubmit = dniIsValid && phoneIsValid && !lookupMutation.isPending

  useEffect(() => {
    setLookupResult(null)
    setLookupError(null)
    setSelectedPeriodId(null)
    setReportSuccess(false)
    setLastCredentials(null)
    setSelectedSubscriptionId(null)
    setExpandedSubscriptions({})
    reset(
      storedCredentials
        ? { dniPrefix: storedCredentials.dniPrefix, dniDigits: storedCredentials.dniDigits, phone: storedCredentials.phone }
        : { dniPrefix: 'V-', dniDigits: '', phone: '' },
    )
  }, [orgSlug, reset, storedCredentials])

  const persistCredentials = (data: LookupForm, remember: boolean) => {
    try {
      if (remember) {
        localStorage.setItem(
          CONSULTA_STORAGE_KEY,
          JSON.stringify({ dniPrefix: data.dniPrefix, dniDigits: data.dniDigits, phone: data.phone, remember: true }),
        )
      } else {
        localStorage.removeItem(CONSULTA_STORAGE_KEY)
      }
    } catch {
      // almacenamiento no disponible: la consulta sigue funcionando
    }
  }

  const handleClearSaved = () => {
    try {
      localStorage.removeItem(CONSULTA_STORAGE_KEY)
    } catch {
      // sin almacenamiento: solo limpia memoria
    }
    reset({ dniPrefix: 'V-', dniDigits: '', phone: '' })
    setLookupResult(null)
    setLookupError(null)
    setLastCredentials(null)
    setSelectedPeriodId(null)
    setReportSuccess(false)
    setSelectedSubscriptionId(null)
    setExpandedSubscriptions({})
    setRememberMe(false)
    setRememberToast('Datos borrados de este dispositivo.')
    dniInputRef.current?.focus()
  }

  const onLookup = async (data: LookupForm) => {
    setLookupError(null)
    setSelectedPeriodId(null)
    setReportSuccess(false)
    setSelectedSubscriptionId(null)
    try {
      const normalizedDni = `${data.dniPrefix}${data.dniDigits}`
      const result = await lookupMutation.mutateAsync({
        dni: normalizedDni,
        phone: data.phone,
      })
      setLookupResult(result)
      setLastCredentials({ dni: normalizedDni, phone: data.phone })
      persistCredentials(data, rememberMe)
      const firstWithDebt = result.subscriptions.find((s) =>
        result.periods.some((p) => p.subscriptionId === s.id && p.status !== 'PAID'),
      )
      const defaultSub = firstWithDebt ?? result.subscriptions[0] ?? null
      setSelectedSubscriptionId(defaultSub ? defaultSub.id : null)
      if (defaultSub) {
        setExpandedSubscriptions({ [defaultSub.id]: true })
      }
    } catch (err) {
      setLookupResult(null)
      setLastCredentials(null)
      const apiError = err as ApiError
      setLookupError(apiError.message || GENERIC_NOT_FOUND)
    }
  }

  const subscriptionsWithDebt = useMemo(() => {
    if (!lookupResult) return []
    const periodsBySub = new Map<string, typeof lookupResult.periods>()
    for (const period of lookupResult.periods) {
      const list = periodsBySub.get(period.subscriptionId) ?? []
      list.push(period)
      periodsBySub.set(period.subscriptionId, list)
    }
    return lookupResult.subscriptions.map((sub) => {
      const subPeriods = (periodsBySub.get(sub.id) ?? []).slice().sort(
        (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
      )
      const unpaid = subPeriods.filter((p) => p.status !== 'PAID')
      const paidHistory = subPeriods
        .filter((p) => p.status === 'PAID')
        .slice()
        .sort((a, b) => {
          const aTime = a.paidAt ? new Date(a.paidAt).getTime() : new Date(a.endDate).getTime()
          const bTime = b.paidAt ? new Date(b.paidAt).getTime() : new Date(b.endDate).getTime()
          return bTime - aTime
        })
      const overdueCount = subPeriods.filter((p) => p.status === 'OVERDUE').length
      const pendingCount = subPeriods.filter((p) => p.status === 'PENDING').length
      const subDebt = unpaid.reduce((sum, p) => sum + p.amount, 0)
      const paidTotal = paidHistory.reduce((sum, p) => sum + p.amount, 0)
      const oldestUnpaid = unpaid[0] ?? null
      const lastPayment = paidHistory[0] ?? null
      return { sub, subPeriods, unpaid, paidHistory, overdueCount, pendingCount, subDebt, paidTotal, oldestUnpaid, lastPayment }
    })
  }, [lookupResult])

  const effectiveSubscriptionId = useMemo(() => {
    if (!lookupResult) return null
    if (selectedSubscriptionId && lookupResult.subscriptions.some((s) => s.id === selectedSubscriptionId)) {
      return selectedSubscriptionId
    }
    return subscriptionsWithDebt[0]?.sub.id ?? null
  }, [lookupResult, selectedSubscriptionId, subscriptionsWithDebt])

  const toggleSubscription = (id: string) => {
    setExpandedSubscriptions((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const selectedPeriod = lookupResult?.periods.find((p) => p.id === selectedPeriodId) ?? null
  const selectedPeriodSub = selectedPeriod
    ? lookupResult?.subscriptions.find((s) => s.id === selectedPeriod.subscriptionId) ?? null
    : null
  const minPaidAt = selectedPeriod?.startDate ? selectedPeriod.startDate.split('T')[0] : ''

  const {
    register: registerReport,
    handleSubmit: handleReportSubmit,
    setValue: setReportValue,
    reset: resetReport,
    formState: { errors: reportErrors },
  } = useForm<ReportForm>({
    resolver: zodResolver(reportSchema(minPaidAt)),
    defaultValues: { paidAt: new Date().toISOString().split('T')[0] },
  })

  const closeSheet = () => {
    setSelectedPeriodId(null)
    setReportSuccess(false)
    resetReport()
  }

  const onReport = async (data: ReportForm) => {
    if (!selectedPeriod || !lookupResult || !lastCredentials) return
    try {
      await reportMutation.mutateAsync({
        dni: lastCredentials.dni,
        phone: lastCredentials.phone,
        billingPeriodId: selectedPeriod.id,
        paymentMethod: data.paymentMethod as PaymentMethod,
        paidAt: data.paidAt,
        notes: data.notes || undefined,
      })
      setReportSuccess(true)
      try {
        const refreshed = await lookupMutation.mutateAsync(lastCredentials)
        setLookupResult(refreshed)
      } catch {
        // mantiene el resultado anterior si la re-consulta falla
      }
    } catch {
      // el mensaje de error se muestra inline via reportApiError
    }
  }

  const reportApiError = reportMutation.error as ApiError | null

  if (orgLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (orgError || (!orgLoading && !orgData)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center text-surface-foreground">
          <Building2 className="mx-auto h-12 w-12 text-muted-foreground" />
          <h1 className="mt-4 text-xl font-bold text-foreground">Organización no disponible</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            El enlace de consulta no es válido o la organización está inactiva.
          </p>
          <Button asChild className="mt-6">
            <Link to="/login">Ir al inicio</Link>
          </Button>
        </div>
      </div>
    )
  }

  const hasDebt = lookupResult ? lookupResult.periods.some((p) => p.status !== 'PAID') : false

  const orgName = orgData!.organization.name

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-header text-header-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-center px-4 py-3">
          <BrandMark size="sm" />
        </div>
      </header>
      <ExchangeTicker />

      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 pb-16">
        <section aria-labelledby="consulta-title" className="overflow-hidden rounded-2xl border border-border bg-surface text-surface-foreground">
          <div className="border-b border-border-subtle bg-surface-muted px-4 py-3 sm:px-6">
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {orgName}
            </p>
            <h1 id="consulta-title" className="mt-0.5 text-xl font-bold text-foreground sm:text-2xl">
              Consulta de pagos
            </h1>
          </div>
          <p className="px-4 py-3 text-sm text-muted-foreground sm:px-6">
            Ingresa tu cédula y teléfono para ver tu deuda y reportar pagos.
          </p>
        </section>

        <form
          onSubmit={handleSubmit(onLookup)}
          className="space-y-4 rounded-2xl border border-border bg-surface p-4 text-surface-foreground sm:p-6"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor="consulta-dni" className="text-foreground">
                Cédula *
              </Label>
              {(storedCredentials || lookupResult || isDirty) && (
                <button
                  type="button"
                  onClick={handleClearSaved}
                  className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground"
                  title="Borra tus datos guardados en este dispositivo y limpia el formulario."
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Limpiar datos
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <Controller
                name="dniPrefix"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger
                      aria-label="Tipo de cédula"
                      className="h-12 w-20 shrink-0"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="V-">V-</SelectItem>
                      <SelectItem value="J-">J-</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              <div className="relative min-w-0 flex-1">
                <IdCard className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Controller
                  name="dniDigits"
                  control={control}
                  render={({ field }) => (
                    <Input
                      id="consulta-dni"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="12345678"
                      aria-invalid={!!errors.dniDigits}
                      aria-describedby={errors.dniDigits ? 'consulta-dni-error' : undefined}
                      className="h-12 pl-9 pr-9 tabular-nums"
                      value={field.value}
                      ref={(el) => {
                        field.ref(el)
                        dniInputRef.current = el
                      }}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 9)
                        field.onChange(digits)
                        if (lookupError) setLookupError(null)
                      }}
                      onBlur={field.onBlur}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !dniIsValid) e.preventDefault()
                      }}
                    />
                  )}
                />
                <span
                  className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium tabular-nums ${dniDigits.length > 9 ? 'text-destructive' : dniIsValid ? 'text-success' : 'text-muted-foreground'}`}
                  aria-hidden="true"
                >
                  {dniDigits.length}/9
                </span>
              </div>
            </div>
            {errors.dniDigits ? (
              <p id="consulta-dni-error" role="alert" className="text-sm font-medium text-destructive">
                {errors.dniDigits.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                {dniPrefix} + 7 a 9 dígitos, sin puntos ni guiones.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="consulta-phone" className="text-foreground">
              Teléfono *
            </Label>
            <Controller
              name="phone"
              control={control}
              render={({ field }) => (
                <PhoneInput
                  id="consulta-phone"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'consulta-phone-error' : 'consulta-phone-hint'}
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    if (lookupError) setLookupError(null)
                  }}
                  onBlur={field.onBlur}
                />
              )}
            />
            {errors.phone ? (
              <p id="consulta-phone-error" role="alert" className="text-sm font-medium text-destructive">
                {errors.phone.message}
              </p>
            ) : (
              <p id="consulta-phone-hint" className="text-xs text-muted-foreground">
                {phoneNationalDigits
                  ? `Detectado: +58 ${phoneNationalDigits} — debe coincidir con tu número registrado.`
                  : 'Número venezolano: 0414, 0424, 0412...'}
              </p>
            )}
          </div>

          {lookupError && (
            <div role="alert" className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{lookupError}</p>
                <button
                  type="button"
                  className="mt-1 text-xs font-semibold underline underline-offset-2"
                  onClick={() => {
                    setLookupError(null)
                    dniInputRef.current?.focus()
                  }}
                >
                  Revisar datos
                </button>
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="h-12 w-full text-base font-semibold"
            disabled={!canSubmit}
          >
            {lookupMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                {storedCredentials && !isDirty && !lookupResult ? 'Consultar (datos guardados)' : lookupResult ? 'Consultar de nuevo' : 'Consultar deuda'}
              </>
            )}
          </Button>

          <button
            type="button"
            role="switch"
            aria-checked={rememberMe}
            onClick={() => setRememberMe((v) => !v)}
            className="flex w-full items-center gap-3 rounded-xl px-1 py-1 text-left"
          >
            <span
              aria-hidden="true"
              className={`relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${rememberMe ? 'bg-primary' : 'bg-surface-active'}`}
            >
              <span
                className={`h-5 w-5 rounded-full bg-surface shadow transition-transform ${rememberMe ? 'translate-x-5' : 'translate-x-0.5'}`}
              />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-foreground">Recordarme en este dispositivo</span>
              <span className="block text-xs text-muted-foreground">
                Guarda tu cédula y teléfono solo en este navegador para consultas rápidas.
              </span>
            </span>
          </button>

          {rememberToast && !lookupResult && (
            <p role="status" className="text-center text-xs font-medium text-success">
              {rememberToast}
            </p>
          )}
          {!lookupResult && !dniIsValid && !errors.dniDigits && !storedCredentials && (
            <p className="text-center text-xs text-muted-foreground">
              Completa tu cédula y teléfono para habilitar la consulta.
            </p>
          )}
          {!lookupResult && storedCredentials && !isDirty && (
            <p className="text-center text-xs text-muted-foreground">
              Tienes datos guardados — toca consultar o usa "Limpiar datos" para borrarlos.
            </p>
          )}
        </form>

        {lookupResult && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-surface p-4 text-surface-foreground sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-foreground">
                    {lookupResult.client.firstName} {lookupResult.client.lastName}
                  </p>
                  <p className="text-xs font-medium text-muted-foreground">
                    {lookupResult.client.dni ? `C.I. ${lookupResult.client.dni} · ` : ''}Tel. {lookupResult.client.phoneMasked}
                  </p>
                </div>
                <Badge className={STATUS_SUCCESS}>Verificado</Badge>
              </div>
              {hasDebt && (
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-lg font-bold text-foreground">{formatCurrency(lookupResult.totals.totalDebt)}</p>
                    <BsReference usdAmount={lookupResult.totals.totalDebt} rate={activeRate} className="mt-0.5 block text-center" />
                    <p className="mt-0.5 text-xs text-muted-foreground">Deuda total</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-lg font-bold text-foreground">{lookupResult.totals.overdueCount}</p>
                    <p className="text-xs text-muted-foreground">Vencidos</p>
                  </div>
                  <div className="rounded-xl bg-surface-muted p-3">
                    <p className="text-lg font-bold text-foreground">{lookupResult.totals.pendingCount}</p>
                    <p className="text-xs text-muted-foreground">Pendientes</p>
                  </div>
                </div>
              )}
              {lookupResult.totals.pendingVerificationCount > 0 && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-sm font-medium ${STATUS_INFO}`}>
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span>
                    {lookupResult.totals.pendingVerificationCount} pago(s) en verificación por{' '}
                    {formatCurrency(lookupResult.totals.pendingVerificationAmount)}{' '}
                    <BsReference
                      usdAmount={lookupResult.totals.pendingVerificationAmount}
                      rate={activeRate}
                      className="inline"
                    />
                  </span>
                </div>
              )}
            </div>

            {!hasDebt ? (
              <div className="flex items-center gap-3 rounded-2xl border border-success/20 bg-success/10 p-3 text-success sm:p-4">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-success text-success-foreground">
                  <CheckCircle className="h-5 w-5" />
                </span>
                <div className="min-w-0 text-left">
                  <p className="text-sm font-bold text-foreground">Sin deuda pendiente</p>
                  <p className="truncate text-xs text-muted-foreground">Todos tus períodos están al día.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-semibold text-foreground">
                  Tus suscripciones ({subscriptionsWithDebt.length})
                </p>
                {subscriptionsWithDebt.map(({ sub, subPeriods, unpaid, paidHistory, overdueCount, pendingCount, subDebt, paidTotal, oldestUnpaid, lastPayment }) => {
                  const isSelected = effectiveSubscriptionId === sub.id
                  const isExpanded = expandedSubscriptions[sub.id] ?? isSelected
                  const hasDebt = unpaid.length > 0
                  return (
                    <div
                      key={sub.id}
                      className={`overflow-hidden rounded-2xl border bg-surface text-surface-foreground ${isSelected ? 'border-border-strong' : 'border-border'}`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedSubscriptionId(sub.id)
                          toggleSubscription(sub.id)
                        }}
                        aria-expanded={isExpanded}
                        className="flex w-full items-center gap-3 p-4 text-left"
                      >
                        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-muted-foreground">
                          <Wifi className="h-5 w-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <span className="truncate font-semibold text-foreground">{sub.plan?.name ?? 'Plan'}</span>
                            <Badge className={SUBSCRIPTION_STATUS_COLORS[sub.status]}>
                              {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                            </Badge>
                          </span>
                          <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                            {subscriptionDisplayCode(sub)}
                            {' '}· Corte día {sub.billingDay}
                          </span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {hasDebt ? (
                              <>
                                Debe <span className="font-bold text-foreground">{formatCurrency(subDebt)}</span>
                                {' '}· {overdueCount > 0 ? `${overdueCount} vencido(s)` : ''}
                                {overdueCount > 0 && pendingCount > 0 ? ' · ' : ''}
                                {pendingCount > 0 ? `${pendingCount} pendiente(s)` : ''}
                                {oldestUnpaid ? ` · desde ${formatDate(oldestUnpaid.startDate)}` : ''}
                              </>
                            ) : (
                              'Al día — sin deuda pendiente'
                            )}
                          </span>
                        </span>
                        <ChevronDown className={`h-5 w-5 shrink-0 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </button>

                      {isExpanded && (
                        <div className="space-y-2 border-t border-border-subtle p-4 pt-3">
                          {subPeriods.length === 0 && (
                            <p className="text-sm text-muted-foreground">Sin períodos para esta suscripción.</p>
                          )}
                          {unpaid.map((period, index) => (
                            <div
                              key={period.id}
                              className="rounded-xl border border-border-subtle bg-surface-muted p-3"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-foreground">
                                    <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-surface-active text-[11px] font-bold text-foreground">
                                      {index + 1}
                                    </span>
                                    {period.periodLabel}
                                  </p>
                                  <p className="mt-0.5 text-xs text-muted-foreground">
                                    Vence: <span className="font-medium text-destructive">{formatDate(period.endDate)}</span>
                                  </p>
                                </div>
                                <Badge className={BILLING_PERIOD_STATUS_COLORS[period.status]}>
                                  {BILLING_PERIOD_STATUS_LABELS[period.status]}
                                </Badge>
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-2">
                                <span className="text-left">
                                  <span className="block text-base font-bold text-foreground">{formatCurrency(period.amount)}</span>
                                  <BsReference usdAmount={period.amount} rate={activeRate} />
                                </span>
                                {period.hasPendingReport ? (
                                  <Badge variant="outline" className={STATUS_INFO}>
                                    En verificación
                                  </Badge>
                                ) : (
                                  <Button size="sm" onClick={() => setSelectedPeriodId(period.id)}>
                                    Reportar pago
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                          {paidHistory.length > 0 && (
                            <details className="rounded-xl border border-border-subtle p-3">
                              <summary className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-foreground">
                                <History className="h-3.5 w-3.5 text-muted-foreground" />
                                Historial de pagos ({paidHistory.length}) · {formatCurrency(paidTotal)}
                              </summary>
                              {lastPayment && (
                                <div className="mt-2 rounded-lg bg-success/10 p-2.5 text-xs">
                                  <p className="font-semibold text-foreground">Último pago</p>
                                  <p className="mt-0.5 text-muted-foreground">
                                    {formatCurrency(lastPayment.amount)} · {lastPayment.periodLabel}
                                  </p>
                                  <p className="mt-0.5 text-muted-foreground">
                                    {lastPayment.paidAt ? `Pagado el ${formatDate(lastPayment.paidAt)}` : `Período hasta ${formatDate(lastPayment.endDate)}`}
                                    {lastPayment.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[lastPayment.paymentMethod] ?? lastPayment.paymentMethod}` : ''}
                                  </p>
                                  {lastPayment.reference && (
                                    <p className="mt-0.5 truncate text-muted-foreground">
                                      Ref: {lastPayment.reference}
                                    </p>
                                  )}
                                </div>
                              )}
                              <div className="mt-2 space-y-2">
                                {paidHistory.map((period) => (
                                  <div key={period.id} className="rounded-lg bg-surface-muted p-2.5 text-xs">
                                    <div className="flex items-center justify-between gap-2">
                                      <span className="truncate font-semibold text-foreground">{period.periodLabel}</span>
                                      <span className="shrink-0 font-bold text-foreground">{formatCurrency(period.amount)}</span>
                                    </div>
                                    <div className="mt-1 space-y-0.5 text-muted-foreground">
                                      <p>
                                        {period.paidAt ? `Pagado el ${formatDate(period.paidAt)}` : `Cerrado el ${formatDate(period.endDate)}`}
                                        {period.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[period.paymentMethod] ?? period.paymentMethod}` : ''}
                                      </p>
                                      {period.reference && (
                                        <p className="break-words">Ref: {period.reference}</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {lookupResult.periods.filter((p) => p.status === 'PAID').length > 0 &&
              lookupResult.periods.filter((p) => p.status !== 'PAID').length === 0 && (
              <details className="rounded-2xl border border-border bg-surface p-4 text-surface-foreground">
                <summary className="flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-foreground">
                  <History className="h-4 w-4 text-muted-foreground" />
                  Historial de pagos ({lookupResult.periods.filter((p) => p.status === 'PAID').length})
                </summary>
                <div className="mt-3 space-y-2">
                  {lookupResult.periods
                    .filter((p) => p.status === 'PAID')
                    .slice()
                    .sort((a, b) => {
                      const aTime = a.paidAt ? new Date(a.paidAt).getTime() : new Date(a.endDate).getTime()
                      const bTime = b.paidAt ? new Date(b.paidAt).getTime() : new Date(b.endDate).getTime()
                      return bTime - aTime
                    })
                    .map((period) => {
                      const periodSub = lookupResult.subscriptions.find((s) => s.id === period.subscriptionId)
                      return (
                        <div key={period.id} className="rounded-xl bg-surface-muted p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate font-semibold text-foreground">{period.periodLabel}</span>
                            <span className="shrink-0 font-bold text-foreground">{formatCurrency(period.amount)}</span>
                          </div>
                          {periodSub && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {periodSub.plan?.name ?? 'Plan'} · {subscriptionDisplayCode(periodSub)}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {period.paidAt ? `Pagado el ${formatDate(period.paidAt)}` : `Cerrado el ${formatDate(period.endDate)}`}
                            {period.paymentMethod ? ` · ${PAYMENT_METHOD_LABELS[period.paymentMethod] ?? period.paymentMethod}` : ''}
                          </p>
                          {period.reference && (
                            <p className="mt-0.5 break-words text-xs text-muted-foreground">Ref: {period.reference}</p>
                          )}
                        </div>
                      )
                    })}
                </div>
              </details>
            )}
          </div>
        )}
      </main>

      <Sheet open={!!selectedPeriod} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="sm:max-w-md">
          {!reportSuccess ? (
            <>
              <SheetHeader>
                <SheetTitle>Reportar pago</SheetTitle>
                <SheetDescription>El período sigue pendiente hasta que un administrador lo apruebe</SheetDescription>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-6 pt-4">
                {selectedPeriod && (
                  <form
                    id="public-report-form"
                    onSubmit={handleReportSubmit(onReport)}
                    className="space-y-5"
                  >
                    <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate font-semibold text-foreground">{selectedPeriod.periodLabel}</p>
                        <Badge className={BILLING_PERIOD_STATUS_COLORS[selectedPeriod.status]}>
                          {BILLING_PERIOD_STATUS_LABELS[selectedPeriod.status]}
                        </Badge>
                      </div>
                      {selectedPeriodSub && (
                        <p className="text-xs text-muted-foreground">
                          {selectedPeriodSub.plan?.name ?? 'Plan'} · {subscriptionDisplayCode(selectedPeriodSub)}
                        </p>
                      )}
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Monto a reportar</span>
                        <span className="text-right">
                          <span className="block text-base font-bold text-foreground">
                            {formatCurrency(selectedPeriod.amount)}
                          </span>
                          <BsReference usdAmount={selectedPeriod.amount} rate={activeRate} className="block text-right" />
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-foreground">Fecha de Pago *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground" />
                        <Input type="date" {...registerReport('paidAt')} min={minPaidAt} className="h-12 pl-9" />
                      </div>
                      {reportErrors.paidAt && (
                        <p className="text-sm font-medium text-destructive">{reportErrors.paidAt.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-foreground">Método de Pago *</Label>
                      <Select onValueChange={(value) => setReportValue('paymentMethod', value)}>
                        <SelectTrigger className="h-12">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            <SelectValue placeholder="Seleccione método" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(PAYMENT_METHOD_LABELS)
                            .filter(([key]) => key !== 'INITIAL_PAYMENT')
                            .map(([key, label]) => (
                              <SelectItem key={key} value={key} className="py-3">
                                {label}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {reportErrors.paymentMethod && (
                        <p className="text-sm font-medium text-destructive">{reportErrors.paymentMethod.message}</p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-foreground">Referencia (opcional)</Label>
                      <div className="relative">
                        <AlignLeft className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground" />
                        <Input placeholder="Nro. referencia, banco..." {...registerReport('notes')} className="h-12 pl-9" />
                      </div>
                    </div>

                    {reportApiError && (
                      <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-destructive">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
                        <p className="text-sm font-medium">{reportApiError.message}</p>
                      </div>
                    )}
                  </form>
                )}
              </div>

              <SheetFooter className="border-t border-border pt-4">
                <Button
                  type="submit"
                  form="public-report-form"
                  className="h-14 w-full text-base font-semibold"
                  disabled={reportMutation.isPending}
                >
                  {reportMutation.isPending ? (
                    'Enviando...'
                  ) : (
                    <>
                      <DollarSign className="mr-2 h-5 w-5 shrink-0" />
                      <span className="flex flex-col items-start leading-tight">
                        <span>Enviar reporte {selectedPeriod ? formatCurrency(selectedPeriod.amount) : ''}</span>
                        {selectedPeriod && (
                          <BsReference usdAmount={selectedPeriod.amount} rate={activeRate} className="text-xs text-primary-foreground/80" />
                        )}
                      </span>
                    </>
                  )}
                </Button>
                <Button type="button" variant="ghost" className="mt-2 h-12 w-full text-muted-foreground" onClick={closeSheet}>
                  Cancelar
                </Button>
              </SheetFooter>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center p-6">
              <div className="space-y-4 py-10 text-center">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-success/10 text-success">
                  <CheckCircle className="h-10 w-10 shrink-0" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground">Reporte enviado</h3>
                  <p className="mt-2 font-medium text-muted-foreground">
                    {selectedPeriod ? `${formatCurrency(selectedPeriod.amount)} — ${selectedPeriod.periodLabel}` : ''}
                  </p>
                  {selectedPeriod && (
                    <BsReference usdAmount={selectedPeriod.amount} rate={activeRate} className="mt-1 block text-center" />
                  )}
                  <p className="mt-1 text-sm text-muted-foreground">
                    Tu pago está en verificación. Te avisaremos cuando sea aprobado.
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={closeSheet}
                >
                  Entendido
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  )
}
