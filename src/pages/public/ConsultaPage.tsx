import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
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
import {
  BILLING_PERIOD_STATUS_COLORS,
  BILLING_PERIOD_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_INFO,
  STATUS_SUCCESS,
  formatCurrency,
  formatDate,
} from '@/lib/constants'
import { isValidDni, normalizeDni } from '@/lib/utils'
import {
  AlignLeft,
  AlertTriangle,
  Building2,
  Calendar,
  CheckCircle,
  CreditCard,
  DollarSign,
  IdCard,
  Loader2,
  Phone,
  Search,
} from 'lucide-react'

const lookupSchema = z.object({
  dni: z
    .string()
    .min(1, 'La cédula es requerida')
    .refine((v) => isValidDni(normalizeDni(v)), {
      message: 'Cédula inválida. Use formato V-12345678.',
    }),
  phone: z.string().min(1, 'El teléfono es requerido'),
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

export function ConsultaPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>()
  const { data: orgData, isLoading: orgLoading, isError: orgError } = usePublicOrganization(orgSlug)

  const [lookupResult, setLookupResult] = useState<PublicLookupResponse | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null)
  const [reportSuccess, setReportSuccess] = useState(false)
  const [lastCredentials, setLastCredentials] = useState<{ dni: string; phone: string } | null>(null)

  const lookupMutation = usePublicLookup(orgSlug)
  const reportMutation = usePublicCreateReport(orgSlug)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LookupForm>({
    resolver: zodResolver(lookupSchema),
    defaultValues: { dni: '', phone: '' },
  })
  const phoneValue = watch('phone', '')

  useEffect(() => {
    setLookupResult(null)
    setLookupError(null)
    setSelectedPeriodId(null)
    setReportSuccess(false)
    setLastCredentials(null)
  }, [orgSlug])

  const onLookup = async (data: LookupForm) => {
    setLookupError(null)
    setSelectedPeriodId(null)
    setReportSuccess(false)
    try {
      const normalizedDni = normalizeDni(data.dni)
      const result = await lookupMutation.mutateAsync({
        dni: normalizedDni,
        phone: data.phone,
      })
      setLookupResult(result)
      setLastCredentials({ dni: normalizedDni, phone: data.phone })
    } catch (err) {
      setLookupResult(null)
      setLastCredentials(null)
      const apiError = err as ApiError
      setLookupError(apiError.message || GENERIC_NOT_FOUND)
    }
  }

  const selectedPeriod = lookupResult?.periods.find((p) => p.id === selectedPeriodId) ?? null
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

  const orgName = orgData!.organization.name

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border-subtle bg-header text-header-foreground">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <BrandMark size="sm" />
          <span className="truncate text-sm font-medium">{orgName}</span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-4 px-4 py-6 pb-16">
        <div>
          <h1 className="text-xl font-bold sm:text-2xl">Consulta de pagos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ingresa tu cédula y teléfono para ver tu deuda y reportar pagos de {orgName}.
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onLookup)}
          className="space-y-4 rounded-2xl border border-border bg-surface p-4 text-surface-foreground sm:p-6"
        >
          <div className="space-y-1.5">
            <Label className="text-foreground">Cédula *</Label>
            <div className="relative">
              <IdCard className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="V-12345678" {...register('dni')} className="h-12 pl-9" autoComplete="off" />
            </div>
            {errors.dni && <p className="text-sm font-medium text-destructive">{errors.dni.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground">Teléfono *</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <div className="[&>div]:pl-9">
                <PhoneInput value={phoneValue} onValueChange={(v) => setValue('phone', v)} />
              </div>
            </div>
            {errors.phone && <p className="text-sm font-medium text-destructive">{errors.phone.message}</p>}
          </div>

          {lookupError && (
            <div className="flex items-start gap-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-destructive">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="text-sm font-medium">{lookupError}</p>
            </div>
          )}

          <Button type="submit" className="h-12 w-full text-base font-semibold" disabled={lookupMutation.isPending}>
            {lookupMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Consultando...
              </>
            ) : (
              <>
                <Search className="mr-2 h-5 w-5" />
                Consultar deuda
              </>
            )}
          </Button>
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
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface-muted p-3">
                  <p className="text-lg font-bold text-foreground">{formatCurrency(lookupResult.totals.totalDebt)}</p>
                  <p className="text-xs text-muted-foreground">Deuda total</p>
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
              {lookupResult.totals.pendingVerificationCount > 0 && (
                <div className={`mt-3 flex items-center gap-2 rounded-xl border p-3 text-sm font-medium ${STATUS_INFO}`}>
                  <CheckCircle className="h-5 w-5 shrink-0" />
                  <span>
                    {lookupResult.totals.pendingVerificationCount} pago(s) en verificación por{' '}
                    {formatCurrency(lookupResult.totals.pendingVerificationAmount)}
                  </span>
                </div>
              )}
            </div>

            {lookupResult.periods.filter((p) => p.status !== 'PAID').length === 0 ? (
              <div className="rounded-2xl border border-border bg-surface p-6 text-center text-surface-foreground">
                <CheckCircle className="mx-auto h-10 w-10 text-success" />
                <p className="mt-2 font-semibold text-foreground">Sin deuda pendiente</p>
                <p className="mt-1 text-sm text-muted-foreground">Todos tus períodos están al día.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {lookupResult.periods
                  .filter((p) => p.status !== 'PAID')
                  .map((period) => (
                    <div
                      key={period.id}
                      className="rounded-2xl border border-border bg-surface p-4 text-surface-foreground"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-foreground">{period.periodLabel}</p>
                          <p className="text-xs text-muted-foreground">
                            Vence: <span className="font-medium text-destructive">{formatDate(period.endDate)}</span>
                          </p>
                        </div>
                        <Badge className={BILLING_PERIOD_STATUS_COLORS[period.status]}>
                          {BILLING_PERIOD_STATUS_LABELS[period.status]}
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className="text-lg font-bold text-foreground">{formatCurrency(period.amount)}</span>
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
              </div>
            )}

            {lookupResult.periods.filter((p) => p.status === 'PAID').length > 0 && (
              <details className="rounded-2xl border border-border bg-surface p-4 text-surface-foreground">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">
                  Períodos pagados ({lookupResult.periods.filter((p) => p.status === 'PAID').length})
                </summary>
                <div className="mt-3 space-y-2">
                  {lookupResult.periods
                    .filter((p) => p.status === 'PAID')
                    .map((period) => (
                      <div key={period.id} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{period.periodLabel}</span>
                        <span className="font-medium text-foreground">{formatCurrency(period.amount)}</span>
                      </div>
                    ))}
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
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground">{selectedPeriod.periodLabel}</p>
                        <Badge className={BILLING_PERIOD_STATUS_COLORS[selectedPeriod.status]}>
                          {BILLING_PERIOD_STATUS_LABELS[selectedPeriod.status]}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>Monto a reportar</span>
                        <span className="text-base font-bold text-foreground">
                          {formatCurrency(selectedPeriod.amount)}
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
                      Enviar reporte {selectedPeriod ? formatCurrency(selectedPeriod.amount) : ''}
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
