import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useOrganizationStore } from '@/stores/organization.store'
import { usePaymentReports, useReviewPaymentReport } from '@/hooks/usePaymentReports'
import type { PaymentReportWithDetails } from '@/types/api'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { FilterPill } from '@/components/design-system/FilterPill'
import { ListCard, ListPageLayout } from '@/components/design-system'
import {
  BILLING_PERIOD_STATUS_COLORS,
  BILLING_PERIOD_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  STATUS_ERROR,
  STATUS_SUCCESS,
  STATUS_WARNING,
  formatCurrency,
  formatDate,
} from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import { useDolarRates } from '@/hooks/useExchange'
import { useExchangeStore } from '@/stores/exchange.store'
import { getRateForSource } from '@/lib/exchange'
import { BsReference } from '@/components/exchange/BsReference'
import { CheckCircle, Clock, Inbox, XCircle } from 'lucide-react'

const rejectSchema = z.object({
  notes: z.string().min(1, 'El motivo del rechazo es obligatorio').max(500, 'Máximo 500 caracteres'),
})

type RejectForm = z.infer<typeof rejectSchema>

type StatusFilter = 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'ALL', label: 'Todos' },
]

function ReportStatusBadge({ status }: { status: string }) {
  if (status === 'APPROVED') {
    return (
      <Badge variant="outline" className={STATUS_SUCCESS}>
        <CheckCircle className="mr-1 h-3 w-3 shrink-0" />
        Aprobado
      </Badge>
    )
  }
  if (status === 'REJECTED') {
    return (
      <Badge variant="outline" className={STATUS_ERROR}>
        <XCircle className="mr-1 h-3 w-3 shrink-0" />
        Rechazado
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className={STATUS_WARNING}>
      <Clock className="mr-1 h-3 w-3 shrink-0" />
      En verificación
    </Badge>
  )
}

export function PaymentReportsPage() {
  const organizationId = useOrganizationStore((s) => s.selectedOrganizationId)
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [status, setStatus] = useState<StatusFilter>(
    (searchParams.get('status') as StatusFilter) || 'PENDING',
  )
  const [selected, setSelected] = useState<PaymentReportWithDetails | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const exchangeSource = useExchangeStore((s) => s.source)
  const { data: exchangeRates } = useDolarRates()
  const activeRate = getRateForSource(exchangeRates, exchangeSource)

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    setSearchParams(params)
  }

  const handleStatusChange = (value: StatusFilter) => {
    setStatus(value)
    const params = new URLSearchParams(searchParams)
    if (value === 'PENDING') {
      params.delete('status')
    } else {
      params.set('status', value)
    }
    setSearchParams(params)
  }

  const { data, isLoading } = usePaymentReports({
    status,
    organizationId: organizationId || undefined,
    limit: 50,
    offset: 0,
  })
  const reviewMutation = useReviewPaymentReport()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RejectForm>({ resolver: zodResolver(rejectSchema) })

  const reports = data?.reports || []
  const searchLower = search.trim().toLowerCase()
  const filteredReports = searchLower
    ? reports.filter((report) => {
        const clientName = report.client
          ? `${report.client.firstName} ${report.client.lastName}`.toLowerCase()
          : ''
        return (
          clientName.includes(searchLower) ||
          (report.client?.dni || '').toLowerCase().includes(searchLower) ||
          (report.billingPeriod?.periodLabel || '').toLowerCase().includes(searchLower) ||
          (report.subscription?.kitNumber || '').toLowerCase().includes(searchLower)
        )
      })
    : reports
  const isEmpty = !isLoading && filteredReports.length === 0

  const closeSheet = () => {
    setSelected(null)
    setRejectMode(false)
    reset()
  }

  const handleApprove = async () => {
    if (!selected) return
    try {
      await reviewMutation.mutateAsync({ id: selected.id, data: { action: 'approve' } })
      closeSheet()
    } catch {
      // toast handled in hook
    }
  }

  const handleReject = async (form: RejectForm) => {
    if (!selected) return
    try {
      await reviewMutation.mutateAsync({ id: selected.id, data: { action: 'reject', notes: form.notes } })
      closeSheet()
    } catch {
      // toast handled in hook
    }
  }

  return (
    <>
      <ListPageLayout
        title="Reportes de pago"
        description="Aprueba o rechaza los pagos reportados por los clientes desde el portal público."
        searchProps={{ value: search, onChange: handleSearch, placeholder: 'Buscar por cliente, cédula, kit...' }}
        filters={
          <>
            {STATUS_FILTERS.map((f) => (
              <FilterPill key={f.value} active={status === f.value} onClick={() => handleStatusChange(f.value)}>
                {f.label}
              </FilterPill>
            ))}
          </>
        }
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyIcon={<Inbox className="h-16 w-16 text-subtle-foreground" />}
        emptyTitle="Sin reportes"
        emptyDescription={
          status === 'PENDING'
            ? 'No hay pagos pendientes de verificación.'
            : 'No encontramos reportes con ese estado.'
        }
      >
        <div className="space-y-3">
          {filteredReports.map((report) => (
            <ListCard key={report.id} onClick={() => setSelected(report)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {report.client ? getClientFullName(report.client) : 'Sin cliente'}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {report.client?.dni ? `C.I. ${report.client.dni} · ` : ''}
                    {report.billingPeriod?.periodLabel || report.billingPeriodId} ·{' '}
                    {report.subscription?.kitNumber || ''}
                  </p>
                </div>
                <ReportStatusBadge status={report.status} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="flex min-w-0 flex-col">
                  <span className="text-base font-bold text-foreground">{formatCurrency(report.amount)}</span>
                  <BsReference usdAmount={report.amount} rate={activeRate} />
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {PAYMENT_METHOD_LABELS[report.paymentMethod] || report.paymentMethod}
                  </span>
                  {report.billingPeriod && (
                    <Badge variant="outline" className={BILLING_PERIOD_STATUS_COLORS[report.billingPeriod.status]}>
                      {BILLING_PERIOD_STATUS_LABELS[report.billingPeriod.status]}
                    </Badge>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(report.createdAt)}</span>
                </div>
              </div>
            </ListCard>
          ))}
        </div>
      </ListPageLayout>

      <Sheet open={!!selected} onOpenChange={(open) => !open && closeSheet()}>
        <SheetContent className="sm:max-w-md">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Revisar reporte</SheetTitle>
                <SheetDescription>
                  {selected.client ? getClientFullName(selected.client) : 'Sin cliente'}
                  {selected.client?.dni ? ` · C.I. ${selected.client.dni}` : ''}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-4">
                <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Período</span>
                    <span className="font-semibold text-foreground">
                      {selected.billingPeriod?.periodLabel || selected.billingPeriodId}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monto</span>
                    <span className="text-right">
                      <span className="block text-base font-bold text-foreground">{formatCurrency(selected.amount)}</span>
                      <BsReference usdAmount={selected.amount} rate={activeRate} className="block text-right" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Método</span>
                    <span className="font-medium text-foreground">
                      {PAYMENT_METHOD_LABELS[selected.paymentMethod] || selected.paymentMethod}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fecha de pago</span>
                    <span className="font-medium text-foreground">{formatDate(selected.paidAt)}</span>
                  </div>
                  {selected.notes && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="shrink-0 text-sm text-muted-foreground">Referencia</span>
                      <span className="truncate font-medium text-foreground">{selected.notes}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Reportado</span>
                    <span className="font-medium text-foreground">{formatDate(selected.createdAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado</span>
                    <ReportStatusBadge status={selected.status} />
                  </div>
                </div>

                {selected.status !== 'PENDING' ? (
                  <div className="rounded-xl border border-border-subtle bg-surface-muted p-4 text-sm">
                    <p className="font-semibold text-foreground">
                      {selected.status === 'APPROVED' ? 'Ya aprobado' : 'Ya rechazado'}
                      {selected.reviewedAt ? ` · ${formatDate(selected.reviewedAt)}` : ''}
                    </p>
                    {selected.reviewNotes && (
                      <p className="mt-1 text-muted-foreground">Motivo: {selected.reviewNotes}</p>
                    )}
                  </div>
                ) : rejectMode ? (
                  <form id="reject-report-form" onSubmit={handleSubmit(handleReject)} className="space-y-2">
                    <Label className="text-foreground">Motivo del rechazo *</Label>
                    <Input placeholder="Ej: referencia inválida, monto no coincide..." {...register('notes')} className="h-12" />
                    {errors.notes && (
                      <p className="text-sm font-medium text-destructive">{errors.notes.message}</p>
                    )}
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Al aprobar se registra el pago del período con el mismo flujo de caja. Al rechazar debes indicar el motivo.
                  </p>
                )}
              </div>

              <SheetFooter className="border-t border-border pt-4">
                {selected.status === 'PENDING' && !rejectMode && (
                  <div className="flex w-full gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 flex-1"
                      onClick={() => setRejectMode(true)}
                    >
                      Rechazar
                    </Button>
                    <Button
                      type="button"
                      className="h-12 flex-1"
                      onClick={handleApprove}
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? 'Procesando...' : 'Aprobar pago'}
                    </Button>
                  </div>
                )}
                {selected.status === 'PENDING' && rejectMode && (
                  <div className="flex w-full gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-12 flex-1"
                      onClick={() => {
                        setRejectMode(false)
                        reset()
                      }}
                    >
                      Volver
                    </Button>
                    <Button
                      type="submit"
                      form="reject-report-form"
                      variant="destructive"
                      className="h-12 flex-1"
                      disabled={reviewMutation.isPending}
                    >
                      {reviewMutation.isPending ? 'Procesando...' : 'Confirmar rechazo'}
                    </Button>
                  </div>
                )}
                {selected.status !== 'PENDING' && (
                  <Button type="button" variant="ghost" className="h-12 w-full" onClick={closeSheet}>
                    Cerrar
                  </Button>
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}
