import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle, Clock, Inbox, XCircle } from 'lucide-react'
import {
  useAllOrganizationPlanPaymentReports,
  useReviewOrganizationPlanPaymentReport,
} from '@/hooks/useOrganizationPlanPaymentReports'
import {
  BUSINESS_PLANS,
  CUSTOM_PLAN_MIN_CLIENTS,
  STATUS_ERROR,
  STATUS_SUCCESS,
  STATUS_WARNING,
  formatCurrency,
  formatDate,
} from '@/lib/constants'
import { ListCard, ListPageLayout } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import type {
  OrganizationPlanPaymentMethod,
  OrganizationPlanPaymentReport,
  OrganizationPlanPaymentReportStatus,
} from '@/types/api'

const ORG_PLAN_METHOD_LABELS: Record<OrganizationPlanPaymentMethod, string> = {
  transferencia: 'Transferencia',
  usdt: 'USDT',
  efectivo: 'Efectivo',
}

const STATUS_FILTERS: {
  value: OrganizationPlanPaymentReportStatus | 'ALL'
  label: string
}[] = [
  { value: 'PENDING', label: 'Pendientes' },
  { value: 'APPROVED', label: 'Aprobados' },
  { value: 'REJECTED', label: 'Rechazados' },
  { value: 'ALL', label: 'Todos' },
]

function StatusBadge({ status }: { status: OrganizationPlanPaymentReportStatus }) {
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

export function OrganizationPlanReportsPage() {
  const [status, setStatus] = useState<OrganizationPlanPaymentReportStatus | 'ALL'>('PENDING')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<OrganizationPlanPaymentReport | null>(null)
  const [rejectMode, setRejectMode] = useState(false)
  const [notes, setNotes] = useState('')
  const [clientLimit, setClientLimit] = useState('')
  const { data, isLoading } = useAllOrganizationPlanPaymentReports(status)
  const reviewMutation = useReviewOrganizationPlanPaymentReport()
  const reports = data?.reports ?? []
  const searchLower = search.trim().toLowerCase()
  const filteredReports = searchLower
    ? reports.filter((report) =>
        (report.organizationName || report.organizationId).toLowerCase().includes(searchLower),
      )
    : reports

  const closeSheet = () => {
    setSelected(null)
    setRejectMode(false)
    setNotes('')
    setClientLimit('')
  }

  const handleApprove = async () => {
    if (!selected) return
    try {
      await reviewMutation.mutateAsync({
        id: selected.id,
        data: {
          action: 'approve',
          clientLimit:
            selected.plan === 'a-medida' && clientLimit ? Number(clientLimit) : undefined,
        },
      })
      closeSheet()
    } catch {
      // toast handled in hook
    }
  }

  const handleReject = async () => {
    if (!selected || !notes.trim()) return
    try {
      await reviewMutation.mutateAsync({
        id: selected.id,
        data: { action: 'reject', notes: notes.trim() },
      })
      closeSheet()
    } catch {
      // toast handled in hook
    }
  }

  return (
    <>
      <ListPageLayout
        title="Reportes de plan"
        description="Aprueba o rechaza los pagos de plan reportados por los administradores."
        searchProps={{
          value: search,
          onChange: setSearch,
          placeholder: 'Buscar por organización...',
        }}
        filters={
          <>
            {STATUS_FILTERS.map((filter) => (
              <FilterPill
                key={filter.value}
                active={status === filter.value}
                onClick={() => setStatus(filter.value)}
              >
                {filter.label}
              </FilterPill>
            ))}
          </>
        }
        isLoading={isLoading}
        isEmpty={!isLoading && filteredReports.length === 0}
        emptyIcon={<Inbox className="h-16 w-16 text-subtle-foreground" />}
        emptyTitle="Sin reportes de plan"
        emptyDescription={
          status === 'PENDING'
            ? 'No hay pagos de plan pendientes de verificación.'
            : 'No encontramos reportes con ese estado.'
        }
      >
        <div className="mb-3">
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link to="/payment-reports">
              <ArrowLeft className="mr-1 h-4 w-4" />
              Reportes de clientes
            </Link>
          </Button>
        </div>

        <div className="space-y-3">
          {filteredReports.map((report) => (
            <ListCard key={report.id} onClick={() => setSelected(report)}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-foreground">
                    {report.organizationName || report.organizationId}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    Plan {BUSINESS_PLANS[report.plan].label} · {report.months}{' '}
                    {report.months === 1 ? 'mes' : 'meses'}
                  </p>
                </div>
                <StatusBadge status={report.status} />
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span className="text-base font-bold text-foreground">
                  {formatCurrency(report.amount)}
                </span>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="text-xs text-muted-foreground">
                    {ORG_PLAN_METHOD_LABELS[report.method] || report.method}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(report.paidAt)}
                  </span>
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
                <SheetTitle>Revisar pago de plan</SheetTitle>
                <SheetDescription>
                  {selected.organizationName || selected.organizationId}
                </SheetDescription>
              </SheetHeader>

              <div className="flex-1 space-y-4 overflow-y-auto p-6 pt-4">
                <div className="space-y-3 rounded-xl border border-border-subtle bg-surface-muted p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Plan</span>
                    <span className="font-semibold">{BUSINESS_PLANS[selected.plan].label}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Meses</span>
                    <span className="font-medium">{selected.months}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Monto</span>
                    <span className="font-bold">{formatCurrency(selected.amount)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Método</span>
                    <span className="font-medium">
                      {ORG_PLAN_METHOD_LABELS[selected.method] || selected.method}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Fecha de pago</span>
                    <span className="font-medium">{formatDate(selected.paidAt)}</span>
                  </div>
                  {selected.reference && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="shrink-0 text-sm text-muted-foreground">Referencia</span>
                      <span className="truncate font-medium">{selected.reference}</span>
                    </div>
                  )}
                  {selected.notes && (
                    <div className="flex items-start justify-between gap-2">
                      <span className="shrink-0 text-sm text-muted-foreground">Nota</span>
                      <span className="text-right font-medium">{selected.notes}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Estado</span>
                    <StatusBadge status={selected.status} />
                  </div>
                </div>

                {selected.status === 'PENDING' && selected.plan === 'a-medida' && (
                  <div className="space-y-2">
                    <Label htmlFor="plan-report-review-limit">Tope de clientes a asignar</Label>
                    <Input
                      id="plan-report-review-limit"
                      type="number"
                      min={CUSTOM_PLAN_MIN_CLIENTS}
                      value={clientLimit}
                      onChange={(event) => setClientLimit(event.target.value)}
                      placeholder={
                        selected.clientLimit
                          ? String(selected.clientLimit)
                          : `Mínimo ${CUSTOM_PLAN_MIN_CLIENTS}`
                      }
                    />
                  </div>
                )}

                {selected.status !== 'PENDING' ? (
                  <div className="rounded-xl border border-border-subtle bg-surface-muted p-4 text-sm">
                    <p className="font-semibold">
                      {selected.status === 'APPROVED' ? 'Ya aprobado' : 'Ya rechazado'}
                      {selected.reviewedAt ? ` · ${formatDate(selected.reviewedAt)}` : ''}
                    </p>
                    {selected.reviewNotes && (
                      <p className="mt-1 text-muted-foreground">
                        Motivo: {selected.reviewNotes}
                      </p>
                    )}
                  </div>
                ) : rejectMode ? (
                  <div className="space-y-2">
                    <Label htmlFor="plan-report-reject-notes">Motivo del rechazo *</Label>
                    <Input
                      id="plan-report-reject-notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Ej: referencia inválida, monto no coincide..."
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Al aprobar se registra el pago y se actualiza el plan de la organización.
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
                        setNotes('')
                      }}
                    >
                      Volver
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      className="h-12 flex-1"
                      onClick={handleReject}
                      disabled={reviewMutation.isPending || !notes.trim()}
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
