import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useSubscriptionDetail, useUpdateSubscription, useDeleteSubscription } from '@/hooks/useSubscriptions'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { AlertTriangle, Edit, Play, Pause, Trash2, DollarSign, Phone, Box, ListChecks, Hash, Clock } from 'lucide-react'
import { formatCurrency, formatDate, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, BILLING_PERIOD_STATUS_LABELS, BILLING_PERIOD_STATUS_COLORS, PAYMENT_METHOD_LABELS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName, getInitial, hasOlderUnpaidPeriod, canPayAdvance, isAdvancePeriod } from '@/lib/utils'
import { SubscriptionStatus } from '@/types/api'
import type { BillingPeriod, BillingPeriodWithDetails, SubscriptionWithDetails } from '@/types/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { EditPaymentSheet } from '@/components/payment/EditPaymentSheet'
import { PayAdvanceSheet } from '@/components/payment/PayAdvanceSheet'
import { DetailNav } from '@/components/design-system/DetailNav'
import { EmptyState } from '@/components/design-system/EmptyState'

export function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((s) => s.selectedOrganizationId)
  const { data, isLoading, error } = useSubscriptionDetail(id!, organizationId ?? undefined, {
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
      <div className="p-4 text-sm text-warning bg-warning/10 border border-warning/20 rounded-2xl flex items-start gap-3">
        <span className="shrink-0 mt-0.5">⚠️</span>
        <span>Selecciona una organización para ver la suscripción.</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-4 px-2">
        <div className="h-20 bg-muted rounded-2xl animate-pulse mb-6" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 flex-1 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-10 w-full bg-muted rounded-lg animate-pulse my-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="h-16 w-16 bg-destructive/10 text-destructive rounded-full flex items-center justify-center mb-4">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Error al cargar suscripción</h2>
        <p className="text-muted-foreground mt-2 mb-6">No pudimos obtener los datos del kit solicitado.</p>
        <Button asChild>
          <Link to="/subscriptions">Volver a Suscripciones</Link>
        </Button>
      </div>
    )
  }

  const { subscription, billingPeriods, summary } = data
  const showAdvanceButton = canPayAdvance(subscription)

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

  // Confirmación adaptativa: Bottom Sheet en móvil, Drawer lateral en desktop.
  const ConfirmationDialog = ({ 
    open, 
    onOpenChange, 
    title, 
    description, 
    onConfirm, 
    confirmText, 
    isDestructive = false, 
    isPending = false 
  }: any) => (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{description}</SheetDescription>
        </SheetHeader>
        <SheetFooter className="flex-row justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button variant={isDestructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={isPending}>
            {isPending ? 'Procesando...' : confirmText}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )

  return (
    <div className="flex flex-col gap-4 pb-[calc(100px+env(safe-area-inset-bottom))]">
      
      <DetailNav
        backTo="/subscriptions"
        actions={
          <>
            <Button variant="outline" size="icon" asChild className="rounded-full bg-surface text-surface-foreground border-border shadow-sm">
              <Link to={`/subscriptions/${id}/edit`}>
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

      {/* Perfil del Kit / Suscripción */}
      <div className="bg-surface text-surface-foreground border border-border rounded-3xl p-5 shadow-sm space-y-4">

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-foreground truncate flex items-center gap-2">
              <Box className="h-6 w-6 text-muted-foreground" />
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

        <div className="p-3 rounded-xl bg-surface-muted border border-border-subtle flex items-center gap-3">
          {subscription.client ? (
            <>
              <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
                {getInitial(subscription.client.firstName)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground truncate">
                  {getClientFullName(subscription.client)}
                </p>
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <Phone className="h-3 w-3" /> {subscription.client.phone}
                  {subscription.client.dni && ` • C.I. ${subscription.client.dni}`}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Cliente eliminado o no disponible</p>
          )}
        </div>

        {subscription.accountNumber && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
            <Hash className="h-4 w-4 shrink-0" />
            <span>Cuenta Starlink: </span>
            <span className="font-semibold text-foreground">{subscription.accountNumber}</span>
          </div>
        )}

      </div>

      {/* Alerta de Vencimiento Próximo */}
      {subscription.currentPeriod && subscription.currentPeriod.status === 'PENDING' && isExpiringSoon(subscription.currentPeriod.endDate) && (
        <div className="bg-warning/10 border border-warning/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-warning/15 rounded-full text-warning shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-warning">
                {getExpiringLabel(subscription.currentPeriod.endDate)}
              </p>
              <p className="text-xs text-warning/90 mt-1 font-medium">
                Vence el {formatDate(subscription.currentPeriod.endDate)} • {formatCurrency(subscription.currentPeriod.amount)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto shrink-0 h-11"
            onClick={() => handlePayPeriod(subscription.currentPeriod!)}
            disabled={hasOlderUnpaidPeriod(subscription.currentPeriod!, billingPeriods)}
            title={hasOlderUnpaidPeriod(subscription.currentPeriod!, billingPeriods) ? 'Existen períodos anteriores pendientes o vencidos' : undefined}
          >
            <DollarSign className="h-4 w-4 mr-1 shrink-0" />
            Cobrar Ahora
          </Button>
        </div>
      )}

      {showAdvanceButton && (
        <div className="bg-surface text-surface-foreground border border-border rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-success/10 rounded-full text-success shrink-0">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-foreground">Al día — próximo ciclo sin facturar</p>
              <p className="text-xs text-muted-foreground mt-1 font-medium">
                Puede cobrar el siguiente ciclo por adelantado • {formatCurrency(subscription.plan.price)}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full sm:w-auto shrink-0 h-11"
            onClick={() => setAdvanceOpen(true)}
          >
            <DollarSign className="h-4 w-4 mr-1 shrink-0" />
            Pagar por adelantado
          </Button>
        </div>
      )}

      {/* Mini KPIs Horizontales */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar touch-pan-x -mx-4 px-4 snap-x snap-mandatory pt-2">
        <div className="snap-center shrink-0 w-[40vw] min-w-[130px] bg-surface text-surface-foreground border border-border rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-success uppercase tracking-wide">Pagados ({summary.paidPeriods})</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div className="snap-center shrink-0 w-[40vw] min-w-[130px] bg-surface text-surface-foreground border border-border rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-warning uppercase tracking-wide">Pendientes ({summary.pendingPeriods})</p>
          <p className="text-xl font-bold text-foreground mt-1">{formatCurrency(summary.totalPending)}</p>
        </div>
        <div className="snap-center shrink-0 w-[40vw] min-w-[130px] bg-surface text-surface-foreground border border-border rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-destructive uppercase tracking-wide">Vencidos ({summary.overduePeriods})</p>
          <p className="text-xl font-bold text-destructive mt-1">{summary.overduePeriods}</p>
        </div>
      </div>

      {/* Historial de Facturación (List Tiles) */}
      <div className="bg-surface text-surface-foreground border border-border rounded-3xl p-2 sm:p-4 shadow-sm mt-2">
        <div className="flex items-center gap-2 p-3 border-b border-border mb-2">
          <ListChecks className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-base font-bold text-foreground">Historial de Pagos</h2>
        </div>

        {billingPeriods.length === 0 ? (
          <EmptyState
            icon={<Clock className="h-12 w-12 text-subtle-foreground" />}
            title="No hay períodos registrados."
          />
        ) : (
          <div className="space-y-2">
            {billingPeriods.map((period) => (
              <div
                key={period.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-surface-muted border border-border-subtle gap-4"
              >

                <div className="flex items-start gap-3">
                  <div className="shrink-0 pt-1">
                    <Badge className={BILLING_PERIOD_STATUS_COLORS[period.status]}>
                      {BILLING_PERIOD_STATUS_LABELS[period.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-foreground leading-tight">
                      {period.periodLabel}
                    </p>
                    <p className="text-[11px] font-medium text-muted-foreground mt-0.5 uppercase tracking-wide">
                      {formatDate(period.startDate)} — {formatDate(period.endDate)}
                    </p>

                    {period.status === 'PAID' && period.paidAt && (
                      <p className="text-xs font-semibold text-success mt-2 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Pagado: {formatDate(period.paidAt)}
                      </p>
                    )}
                    {period.paymentMethod && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide bg-muted px-2 py-0.5 rounded-sm">
                          {PAYMENT_METHOD_LABELS[period.paymentMethod] ?? period.paymentMethod}
                        </span>
                        {period.paymentMethod === 'INITIAL_PAYMENT' && (
                          <span className="text-[10px] font-bold text-info bg-info/10 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                            Pendiente
                          </span>
                        )}
                        {isAdvancePeriod(period) && (
                          <span className="text-[10px] font-bold text-success bg-success/10 border border-success/20 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                            Adelanto
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:flex-col gap-3 shrink-0">
                  <p className="font-bold text-lg text-foreground text-right">
                    {formatCurrency(period.amount)}
                  </p>

                  <div className="flex gap-2">
                    {period.status !== 'PAID' ? (
                      <Button
                        size="sm"
                        className="h-10 px-4 font-semibold"
                        onClick={() => handlePayPeriod(period)}
                        disabled={hasOlderUnpaidPeriod(period, billingPeriods)}
                        title={hasOlderUnpaidPeriod(period, billingPeriods) ? 'Existen períodos anteriores pendientes o vencidos' : undefined}
                      >
                        <DollarSign className="h-4 w-4 mr-1 shrink-0" />
                        Pagar
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-10 w-10 p-0 bg-surface-muted active:bg-surface-active shadow-sm"
                        onClick={() => handleEditPeriod(period)}
                      >
                        <Edit className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                </div>
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

      <ConfirmationDialog
        open={showStatusDialog}
        onOpenChange={setShowStatusDialog}
        title={`${newStatus === SubscriptionStatus.ACTIVE ? 'Reactivar' : 'Suspender'} Suscripción`}
        description={newStatus === SubscriptionStatus.ACTIVE
          ? '¿Está seguro que desea reactivar el servicio para este kit?'
          : 'El cliente no podrá usar el servicio hasta que lo reactives. ¿Continuar?'}
        onConfirm={handleStatusChange}
        confirmText={newStatus === SubscriptionStatus.ACTIVE ? 'Reactivar' : 'Suspender'}
        isDestructive={newStatus === SubscriptionStatus.SUSPENDED}
        isPending={updateMutation.isPending}
      />

      <ConfirmationDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Eliminar Suscripción"
        description="Esta acción eliminará todos los períodos de facturación asociados al kit y no se puede deshacer. ¿Proceder?"
        onConfirm={handleDelete}
        confirmText="Eliminar permanentemente"
        isDestructive={true}
        isPending={deleteMutation.isPending}
      />
    </div>
  )
}
