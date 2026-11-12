import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useSubscriptionDetail, useUpdateSubscription, useDeleteSubscription } from '@/hooks/useSubscriptions'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { AlertTriangle, SearchX, Edit, Play, Pause, Trash2, DollarSign, Phone, Box, ListChecks, Hash, Clock, UserRound } from 'lucide-react'
import { formatCurrency, formatDate, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, BILLING_PERIOD_STATUS_LABELS, BILLING_PERIOD_STATUS_COLORS, PAYMENT_METHOD_LABELS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName, getInitial, hasOlderUnpaidPeriod, canPayAdvance, isAdvancePeriod } from '@/lib/utils'
import { SubscriptionStatus } from '@/types/api'
import type { BillingPeriod, BillingPeriodWithDetails, SubscriptionWithDetails } from '@/types/api'
import { toast } from 'sonner'
import { EditPaymentSheet } from '@/components/payment/EditPaymentSheet'
import { PayAdvanceSheet } from '@/components/payment/PayAdvanceSheet'
import { DetailNav } from '@/components/design-system/DetailNav'
import { EmptyState } from '@/components/design-system/EmptyState'
import { ErrorState } from '@/components/design-system/ErrorState'
import { DetailSkeleton } from '@/components/design-system/Skeleton'
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog'
import { isNotFoundError } from '@/lib/error-handler'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'
import { getNavigationStatePath } from '@/lib/navigation'

export function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((s) => s.selectedOrganizationId)
  const { data, isLoading, error, refetch, isFetching } = useSubscriptionDetail(id!, organizationId ?? undefined, {
    enabled: !isSuperAdmin || !!organizationId,
  })
  const updateMutation = useUpdateSubscription()
  const deleteMutation = useDeleteSubscription()
  const { openQuickPay } = useUIStore()
  
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<SubscriptionStatus | null>(null)
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriodWithDetails | null>(null)
  const [advanceOpen, setAdvanceOpen] = useState(false)

  if (isSuperAdmin && !organizationId) {
    return (
      <OrganizationSelectionEmptyState description="Elige una organización para consultar esta suscripción." />
    )
  }

  if (isLoading) {
    return <DetailSkeleton label="Cargando suscripción" />
  }

  // Con datos en caché se sigue mostrando el detalle aunque falle la actualización.
  if (!data) {
    const backButton = (
      <Button asChild variant="outline">
        <Link to="/subscriptions">Volver a suscripciones</Link>
      </Button>
    )

    if (isNotFoundError(error)) {
      return (
        <EmptyState
          icon={<SearchX className="h-12 w-12 text-muted-foreground" />}
          title="Suscripción no encontrada"
          description="Puede que se haya eliminado o que el enlace ya no sea válido."
          action={backButton}
        />
      )
    }

    return (
      <div className="flex flex-col items-center py-8">
        <ErrorState
          title="No se pudo cargar la suscripción"
          onRetry={() => void refetch()}
          isRetrying={isFetching}
        />
        {backButton}
      </div>
    )
  }

  const { subscription, billingPeriods, summary } = data
  const showAdvanceButton = canPayAdvance(subscription)
  const unpaidPeriods = billingPeriods
    .filter((period) => period.status === 'PENDING' || period.status === 'OVERDUE')
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
  const oldestUnpaidPeriod = unpaidPeriods[0]
  const returnTo = getNavigationStatePath(location.state, 'from') ?? '/subscriptions'

  const handleStatusChange = async () => {
    if (!newStatus || !id) return

    try {
      await updateMutation.mutateAsync({
        id,
        data: { status: newStatus },
      })
      const action = newStatus === SubscriptionStatus.ACTIVE ? 'reactivada' : 'suspendida'
      toast.success(`Suscripción ${action} correctamente`)
      setShowStatusDialog(false)
      setNewStatus(null)
    } catch {
      toast.error('Error al cambiar el estado de la suscripción')
    }
  }

  const handleDelete = async () => {
    if (!id) return

    try {
      await deleteMutation.mutateAsync(id)
      toast.success('Suscripción eliminada correctamente')
      navigate('/subscriptions')
    } catch {
      toast.error('Error al eliminar la suscripción')
    }
  }

  const handlePayPeriod = (period: BillingPeriod) => {
    openQuickPay({
      period: {
        ...period,
        subscription: { id: subscription.id, kitNumber: subscription.kitNumber, status: subscription.status },
        client: subscription.client,
        plan: subscription.plan,
      },
    })
  }

  const handleEditPeriod = (period: BillingPeriod) => {
    setEditingPeriod({
      ...period,
      subscription: { id: subscription.id, kitNumber: subscription.kitNumber, status: subscription.status },
      client: subscription.client,
      plan: subscription.plan,
    })
  }

  const isReactivating = newStatus === SubscriptionStatus.ACTIVE

  return (
    <div className="flex flex-col gap-3 sm:gap-4">
      
      <DetailNav
        backLabel="Volver a suscripciones"
        backTo="/subscriptions"
        actions={
          <>
            <Button variant="outline" size="icon" asChild className="rounded-full bg-surface text-surface-foreground border-border shadow-sm">
              <Link to={`/subscriptions/${id}/edit`} state={{ returnTo }}>
                <Edit className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                setNewStatus(
                  subscription.status === SubscriptionStatus.ACTIVE
                    ? SubscriptionStatus.SUSPENDED
                    : SubscriptionStatus.ACTIVE
                )
                setShowStatusDialog(true)
              }}
              className="rounded-full shadow-sm"
              title={subscription.status === SubscriptionStatus.ACTIVE ? 'Suspender suscripción' : 'Reactivar suscripción'}
              aria-label={subscription.status === SubscriptionStatus.ACTIVE ? 'Suspender suscripción' : 'Reactivar suscripción'}
            >
              {subscription.status === SubscriptionStatus.ACTIVE ? (
                <Pause className="h-4 w-4 shrink-0" />
              ) : (
                <Play className="h-4 w-4 shrink-0" />
              )}
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowDeleteDialog(true)} className="rounded-full shadow-sm">
              <Trash2 className="h-4 w-4 shrink-0" />
            </Button>
          </>
        }
      />

      {/* Perfil de la Suscripción */}
      <div className="bg-surface text-surface-foreground border border-border rounded-2xl p-3 shadow-sm space-y-3 sm:rounded-3xl sm:p-5 sm:space-y-4">

        <div className="flex items-start justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight text-foreground truncate flex items-center gap-2">
              <Box className="h-5 w-5 text-muted-foreground sm:h-6 sm:w-6" />
              {subscription.accountNumber ? subscription.accountNumber : subscription.kitNumber}
            </h1>
            <p className="text-sm font-medium text-muted-foreground mt-1">
              {subscription.accountNumber ? `${subscription.kitNumber} • ` : ''}Plan: {subscription.plan.name}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge className={`px-2.5 py-1 ${SUBSCRIPTION_STATUS_COLORS[subscription.status]}`}>
              {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
            </Badge>
            {subscription.hasDebt && (
              <Badge variant="destructive" className="px-2.5 py-1">Con deuda</Badge>
            )}
          </div>
        </div>

        <div className="p-2.5 rounded-xl bg-surface-muted border border-border-subtle flex items-center gap-2.5 sm:gap-3 sm:p-3">
          {subscription.client ? (
            <>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary-text flex items-center justify-center font-bold shrink-0">
                {getInitial(subscription.client.firstName)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">
                  {getClientFullName(subscription.client)}
                </p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" /> {subscription.client.phone}
                  {subscription.client.dni && ` • C.I. ${subscription.client.dni}`}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="shrink-0 px-2 sm:px-3"
                aria-label={`Ver perfil de ${getClientFullName(subscription.client)}`}
              >
                <Link to={`/subscriptions/clients/${subscription.client.id}`} state={{ from: `/subscriptions/${id}` }}>
                  <UserRound className="h-4 w-4" />
                  <span>Ver perfil</span>
                </Link>
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Cliente eliminado o no disponible</p>
          )}
        </div>

        {subscription.accountNumber && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
            <Hash className="h-4 w-4 shrink-0" />
            <span>Cuenta: </span>
            <span className="font-semibold text-foreground">{subscription.accountNumber}</span>
          </div>
        )}

      </div>

      {/* Alerta de Vencimiento Próximo */}
      {subscription.currentPeriod && subscription.currentPeriod.status === 'PENDING' && isExpiringSoon(subscription.currentPeriod.endDate) && (
        <div className="bg-warning/10 border border-warning/20 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:rounded-2xl sm:p-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-1.5 bg-warning/15 rounded-full text-warning shrink-0 sm:p-2">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="font-bold text-warning">
                {getExpiringLabel(subscription.currentPeriod.endDate)}
              </p>
              <p className="text-xs text-warning/90 mt-1 font-medium">
                Vence el {formatDate(subscription.currentPeriod.endDate)} • {formatCurrency(subscription.currentPeriod.amount)}
              </p>
              {hasOlderUnpaidPeriod(subscription.currentPeriod, billingPeriods) && oldestUnpaidPeriod && (
                <p className="text-xs text-warning mt-1 font-medium">
                  Hay períodos anteriores sin pagar. Cobra primero {oldestUnpaidPeriod.periodLabel}.
                </p>
              )}
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto shrink-0 h-10 sm:h-11"
            onClick={() => handlePayPeriod(
              hasOlderUnpaidPeriod(subscription.currentPeriod!, billingPeriods) && oldestUnpaidPeriod
                ? oldestUnpaidPeriod
                : subscription.currentPeriod!,
            )}
          >
            <DollarSign className="h-4 w-4 mr-1 shrink-0" />
            {hasOlderUnpaidPeriod(subscription.currentPeriod!, billingPeriods) ? 'Cobrar el más antiguo' : 'Cobrar ahora'}
          </Button>
        </div>
      )}

      {showAdvanceButton && (
        <div className="bg-surface text-surface-foreground border border-border rounded-xl p-3 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 sm:rounded-2xl sm:p-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-1.5 bg-success/10 rounded-full text-success shrink-0 sm:p-2">
              <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">Al día — próximo ciclo sin facturar</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Puedes cobrar el siguiente ciclo por adelantado • {formatCurrency(subscription.plan.price)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto shrink-0 h-10 sm:h-11"
            onClick={() => setAdvanceOpen(true)}
          >
            <DollarSign className="h-4 w-4 mr-1 shrink-0" />
            Pagar por adelantado
          </Button>
        </div>
      )}

      {/* Mini KPIs Horizontales */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar touch-pan-x -mx-4 px-4 snap-x snap-mandatory pt-1 sm:gap-3 sm:pt-2">
        <div className="snap-center shrink-0 w-[40vw] min-w-32.5 bg-surface text-surface-foreground border border-border rounded-xl p-2.5 flex flex-col justify-center sm:rounded-2xl sm:p-4">
          <p className="text-xs font-bold text-success uppercase tracking-wide">Pagados ({summary.paidPeriods})</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div className="snap-center shrink-0 w-[40vw] min-w-32.5 bg-surface text-surface-foreground border border-border rounded-xl p-2.5 flex flex-col justify-center sm:rounded-2xl sm:p-4">
          <p className="text-xs font-bold text-warning uppercase tracking-wide">Pendientes ({summary.pendingPeriods})</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.totalPending)}</p>
        </div>
        <div className="snap-center shrink-0 w-[40vw] min-w-32.5 bg-surface text-surface-foreground border border-border rounded-xl p-2.5 flex flex-col justify-center sm:rounded-2xl sm:p-4">
          <p className="text-xs font-bold text-destructive uppercase tracking-wide">Vencidos ({summary.overduePeriods})</p>
          <p className="text-xl font-bold text-destructive mt-1">{summary.overduePeriods}</p>
        </div>
      </div>

      {/* Historial de Facturación (List Tiles) */}
      <div className="bg-surface text-surface-foreground border border-border rounded-2xl p-1.5 shadow-sm mt-1 sm:mt-2 sm:rounded-3xl sm:p-4">
        <div className="flex items-center gap-2 p-2.5 border-b border-border mb-2 sm:p-3">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-bold text-foreground">Historial de pagos</h2>
        </div>

        {billingPeriods.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-12 w-12 text-subtle-foreground" />}
            title="No hay períodos registrados."
          />
        ) : (
          <div className="space-y-1.5">
            {unpaidPeriods.length > 1 && (
              <p className="px-2 pb-1 text-xs font-medium text-muted-foreground">
                Los períodos se cobran en orden, empezando por {oldestUnpaidPeriod.periodLabel}.
              </p>
            )}
            {billingPeriods.map((period) => (
              <div
                key={period.id}
                className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-muted p-2 sm:gap-3 sm:p-2.5"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex min-w-0 items-center justify-between gap-2">
                    <p className="truncate text-sm font-bold leading-tight text-foreground">
                      {period.periodLabel}
                    </p>
                    <p className="shrink-0 text-sm font-bold text-foreground">
                      {formatCurrency(period.amount)}
                    </p>
                  </div>

                  <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs">
                    <Badge className={`px-2 py-0 text-xs ${BILLING_PERIOD_STATUS_COLORS[period.status]}`}>
                      {BILLING_PERIOD_STATUS_LABELS[period.status]}
                    </Badge>
                    <span className="font-medium text-muted-foreground">
                      {formatDate(period.startDate)} — {formatDate(period.endDate)}
                    </span>
                    {period.status === 'PAID' && period.paidAt && (
                      <span className="flex items-center gap-1 font-semibold text-success">
                        <DollarSign className="h-3 w-3" /> Pagado: {formatDate(period.paidAt)}
                      </span>
                    )}
                    {period.paymentMethod && (
                      <span className="rounded-sm bg-muted px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                        {PAYMENT_METHOD_LABELS[period.paymentMethod] ?? period.paymentMethod}
                      </span>
                    )}
                    {period.paymentMethod === 'INITIAL_PAYMENT' && (
                      <span className="rounded-sm bg-info/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-info">
                        Pendiente
                      </span>
                    )}
                    {isAdvancePeriod(period) && (
                      <span className="rounded-sm border border-success/20 bg-success/10 px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide text-success">
                        Adelanto
                      </span>
                    )}
                  </div>
                </div>

                {period.status !== 'PAID' ? (
                  <Button
                    size="sm"
                    className="h-9 min-w-20 shrink-0 gap-1.5 px-3 font-semibold"
                    onClick={() => handlePayPeriod(period)}
                    disabled={hasOlderUnpaidPeriod(period, billingPeriods)}
                    title={hasOlderUnpaidPeriod(period, billingPeriods) ? 'Existen períodos anteriores pendientes o vencidos' : undefined}
                    aria-label={`Pagar período ${period.periodLabel}`}
                  >
                    <DollarSign className="h-4 w-4 shrink-0" />
                    Pagar
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 min-w-20 shrink-0 gap-1.5 bg-surface-muted px-3 font-semibold active:bg-surface-active shadow-sm"
                    onClick={() => handleEditPeriod(period)}
                    aria-label={`Editar pago del período ${period.periodLabel}`}
                    title="Editar pago"
                  >
                    <Edit className="h-4 w-4 shrink-0 text-muted-foreground" />
                    Editar
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Componentes Hijos (Sheets) */}
      <EditPaymentSheet
        period={editingPeriod}
        open={!!editingPeriod}
        onOpenChange={(open) => !open && setEditingPeriod(null)}
      />
      <PayAdvanceSheet
        subscription={subscription as SubscriptionWithDetails}
        open={advanceOpen}
        onOpenChange={setAdvanceOpen}
      />

      <ConfirmDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        title={`${isReactivating ? 'Reactivar' : 'Suspender'} suscripción`}
        description={isReactivating
          ? '¿Reactivar este servicio? El cliente podrá volver a usarlo.'
          : 'El cliente no podrá usar el servicio hasta que lo reactives. ¿Continuar?'}
        confirmLabel={isReactivating ? 'Reactivar' : 'Suspender'}
        pendingLabel={isReactivating ? 'Reactivando...' : 'Suspendiendo...'}
        destructive={newStatus === SubscriptionStatus.SUSPENDED}
        isPending={updateMutation.isPending}
        onConfirm={handleStatusChange}
      />

      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Eliminar suscripción"
        description="Se eliminarán todos los períodos de facturación de este servicio. Esta acción no se puede deshacer."
        confirmLabel="Eliminar"
        pendingLabel="Eliminando..."
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={handleDelete}
      />
    </div>
  )
}
