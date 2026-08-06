import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useSubscriptionDetail, useUpdateSubscription, useDeleteSubscription } from '@/hooks/useSubscriptions'
import { useGenerateNextPeriod } from '@/hooks/useBilling'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, Link2, AlertTriangle, Edit, Play, Pause, Plus, Trash2, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, BILLING_PERIOD_STATUS_LABELS, BILLING_PERIOD_STATUS_COLORS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { SubscriptionStatus } from '@/types/api'
import type { BillingPeriod, BillingPeriodWithDetails } from '@/types/api'
import { toast } from 'sonner'
import { useNavigate } from 'react-router-dom'
import { EditPaymentModal } from '@/components/payment/EditPaymentModal'

export function SubscriptionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data, isLoading, error } = useSubscriptionDetail(id!)
  const updateMutation = useUpdateSubscription()
  const deleteMutation = useDeleteSubscription()
  const generateMutation = useGenerateNextPeriod()
  const { openQuickPay } = useUIStore()
  const [showStatusDialog, setShowStatusDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [newStatus, setNewStatus] = useState<SubscriptionStatus | null>(null)
  const [editingPeriod, setEditingPeriod] = useState<BillingPeriodWithDetails | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-muted animate-pulse rounded" />
        <div className="h-32 bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="inline-flex rounded-md px-2 py-1 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-950/50">Error al cargar la suscripción</p>
        <Button asChild className="mt-4">
          <Link to="/subscriptions">Volver a suscripciones</Link>
        </Button>
      </div>
    )
  }

  const { subscription, billingPeriods, summary } = data

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

  const handleGenerateNext = async () => {
    if (!id) return

    try {
      await generateMutation.mutateAsync(id)
    } catch {
      // Error handled in hook
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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-start gap-3">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/subscriptions">
              <ArrowLeft className="h-5 w-5 shrink-0" />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Kit #{subscription.kitNumber}</h1>
              <Badge className={SUBSCRIPTION_STATUS_COLORS[subscription.status]}>
                {SUBSCRIPTION_STATUS_LABELS[subscription.status]}
              </Badge>
              {subscription.hasDebt && <Badge variant="destructive">Con deuda</Badge>}
            </div>
            <p className="text-muted-foreground mt-1 text-sm md:text-base truncate">
              {subscription.client.name} • {subscription.client.phone} • Plan: {subscription.plan.name}
              {subscription.accountNumber && <> • Cuenta: {subscription.accountNumber}</>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-12 md:pl-14">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setNewStatus(
                subscription.status === SubscriptionStatus.ACTIVE
                  ? SubscriptionStatus.SUSPENDED
                  : SubscriptionStatus.ACTIVE
              )
              setShowStatusDialog(true)
            }}
          >
            {subscription.status === SubscriptionStatus.ACTIVE ? (
              <>
                <Pause className="h-4 w-4 md:mr-2 shrink-0" />
                <span className="hidden md:inline">Suspender</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 md:mr-2 shrink-0" />
                <span className="hidden md:inline">Reactivar</span>
              </>
            )}
          </Button>
          <Button variant="outline" size="sm" onClick={handleGenerateNext} disabled={generateMutation.isPending}>
            <Plus className="h-4 w-4 md:mr-2 shrink-0" />
            <span className="hidden md:inline">{generateMutation.isPending ? 'Generando...' : 'Generar Próximo Período'}</span>
            <span className="md:hidden">Período</span>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to={`/subscriptions/${id}/edit`}>
              <Edit className="h-4 w-4 md:mr-2 shrink-0" />
              <span className="hidden md:inline">Editar</span>
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="text-red-700 bg-red-50 hover:bg-red-100 dark:text-red-400 dark:bg-red-950/50 dark:hover:bg-red-950" onClick={() => setShowDeleteDialog(true)}>
            <Trash2 className="h-4 w-4 md:mr-2 shrink-0" />
            <span className="hidden md:inline">Eliminar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Períodos</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.totalPeriods}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pagados</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{summary.paidPeriods}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(summary.totalPaid)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-400">{summary.pendingPeriods}</p>
            <p className="text-sm text-muted-foreground">{formatCurrency(summary.totalPending)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-700 dark:text-red-400">{summary.overduePeriods}</p>
          </CardContent>
        </Card>
      </div>

      {subscription.currentPeriod && subscription.currentPeriod.status === 'PENDING' && isExpiringSoon(subscription.currentPeriod.endDate) && (
        <Card className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-400">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div className="flex-1">
                <p className="font-semibold">
                  {getExpiringLabel(subscription.currentPeriod.endDate)}
                </p>
                <p className="text-sm opacity-90">
                  Periodo {subscription.currentPeriod.periodLabel} • Vence: {formatDate(subscription.currentPeriod.endDate)} • {formatCurrency(subscription.currentPeriod.amount)}
                </p>
              </div>
              <Button size="sm" onClick={() => handlePayPeriod(subscription.currentPeriod!)} className="gap-2">
                <DollarSign className="h-4 w-4 shrink-0" />
                <span>Cobrar</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5 shrink-0" />
            Historial de Períodos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {billingPeriods.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No hay períodos registrados</p>
          ) : (
            <div className="space-y-0">
              {billingPeriods.map((period, index) => (
                <div key={period.id}>
                  <div className="flex flex-col gap-2 py-3 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={BILLING_PERIOD_STATUS_COLORS[period.status]}>
                        {BILLING_PERIOD_STATUS_LABELS[period.status]}
                      </Badge>
                      <div>
                        <p className="font-medium text-foreground">{period.periodLabel}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(period.startDate)} — {formatDate(period.endDate)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-left md:text-right">
                        <p className="font-semibold text-foreground">{formatCurrency(period.amount)}</p>
                        {period.paidAt && (
                          <p className="text-sm text-muted-foreground">
                            Pagado: {formatDate(period.paidAt)}
                          </p>
                        )}
                        {period.paymentMethod && (
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-muted-foreground">
                              {period.paymentMethod === 'INITIAL_PAYMENT' ? 'Pago inicial' : period.paymentMethod}
                            </p>
                            {period.paymentMethod === 'INITIAL_PAYMENT' && (
                              <Badge className="text-xs text-blue-700 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/50">
                                Datos pendientes
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      {period.status !== 'PAID' && (
                        <Button
                          size="sm"
                          className="gap-2"
                          onClick={() => handlePayPeriod(period)}
                        >
                          <DollarSign className="h-4 w-4 shrink-0" />
                          <span>Cobrar</span>
                        </Button>
                      )}
                      {period.status === 'PAID' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditPeriod(period)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Edit className="h-4 w-4 shrink-0" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {index < billingPeriods.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <EditPaymentModal
        period={editingPeriod}
        open={!!editingPeriod}
        onOpenChange={(open) => !open && setEditingPeriod(null)}
      />

      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {newStatus === SubscriptionStatus.ACTIVE ? 'Reactivar' : 'Suspender'} Suscripción
            </DialogTitle>
            <DialogDescription>
              {newStatus === SubscriptionStatus.ACTIVE
                ? '¿Está seguro que desea reactivar esta suscripción?'
                : '¿Está seguro que desea suspender esta suscripción? El cliente no podrá usar el servicio hasta que la reactives.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>
              Cancelar
            </Button>
            <Button
              variant={newStatus === SubscriptionStatus.ACTIVE ? 'default' : 'destructive'}
              onClick={handleStatusChange}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? 'Procesando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar Suscripción</DialogTitle>
            <DialogDescription>
              ¿Está seguro que desea eliminar esta suscripción? Esta acción eliminará también todos los períodos de facturación asociados y no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteMutation.isPending}>
              {deleteMutation.isPending ? 'Eliminando...' : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
