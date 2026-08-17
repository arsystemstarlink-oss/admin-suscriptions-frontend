import { useParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { useSubscriptionDetail, useUpdateSubscription, useDeleteSubscription } from '@/hooks/useSubscriptions'
import { useGenerateNextPeriod } from '@/hooks/useBilling'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ArrowLeft, AlertTriangle, Edit, Play, Pause, Plus, Trash2, DollarSign, Phone, Box, ListChecks, Hash, Clock } from 'lucide-react'
import { formatCurrency, formatDate, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, BILLING_PERIOD_STATUS_LABELS, BILLING_PERIOD_STATUS_COLORS, PAYMENT_METHOD_LABELS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName, hasOlderUnpaidPeriod } from '@/lib/utils'
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
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isLoading) {
    return (
      <div className="space-y-4 px-2">
        <div className="h-20 bg-primary-100 dark:bg-primary-900 rounded-2xl animate-pulse mb-6" />
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-24 flex-1 bg-primary-100 dark:bg-primary-900 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-10 w-full bg-primary-100 dark:bg-primary-900 rounded-lg animate-pulse my-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-primary-100 dark:bg-primary-900 rounded-2xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="h-16 w-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 dark:bg-red-950 dark:text-red-400">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-primary-900 dark:text-primary-50">Error al cargar suscripción</h2>
        <p className="text-primary-500 dark:text-primary-400 mt-2 mb-6">No pudimos obtener los datos del kit solicitado.</p>
        <Button asChild>
          <Link to="/subscriptions">Volver a Suscripciones</Link>
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

  // Wrapper Condicional: Si es móvil usa Drawer (Bottom Sheet), si no, Modal normal.
  const ConfirmationDialog = ({ 
    open, 
    onOpenChange, 
    title, 
    description, 
    onConfirm, 
    confirmText, 
    isDestructive = false, 
    isPending = false 
  }: any) => {
    if (isMobile) {
      return (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent>
            <DrawerHeader className="text-left px-4">
              <DrawerTitle>{title}</DrawerTitle>
              <DrawerDescription>{description}</DrawerDescription>
            </DrawerHeader>
            <DrawerFooter className="border-t border-primary-100 dark:border-primary-800 pt-4">
              <Button 
                onClick={onConfirm} 
                className={`w-full h-14 text-base font-semibold shadow-md active:scale-95 transition-transform touch-manipulation ${isDestructive ? 'bg-red-600 hover:bg-red-700 text-white dark:bg-red-700' : 'bg-primary-800 hover:bg-primary-900 text-white dark:bg-primary-700'}`}
                disabled={isPending}
              >
                {isPending ? 'Procesando...' : confirmText}
              </Button>
              <Button variant="ghost" className="w-full h-12 mt-2" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )
    }

    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button variant={isDestructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={isPending}>
              {isPending ? 'Procesando...' : confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <div className="flex flex-col gap-4 pb-[calc(100px+env(safe-area-inset-bottom))]">
      
      {/* Sticky Top Nav Mobile */}
      <div className="sticky top-0 z-20 flex items-center justify-between py-3 bg-slate-50/90 dark:bg-primary-950/90 backdrop-blur-md mb-2 -mx-4 px-4">
        <Link 
          to="/subscriptions" 
          className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 text-primary-600 dark:text-primary-300 shadow-sm active:scale-95 transition-transform touch-manipulation"
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
        </Link>
        <div className="flex items-center gap-2">
          <Link 
            to={`/subscriptions/${id}/edit`}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 text-primary-600 dark:text-primary-300 shadow-sm active:scale-95 transition-transform touch-manipulation"
          >
            <Edit className="h-4 w-4 shrink-0" />
          </Link>
          <button 
            onClick={() => setShowDeleteDialog(true)}
            className="flex items-center justify-center w-10 h-10 rounded-full bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 shadow-sm active:scale-95 transition-transform touch-manipulation"
          >
            <Trash2 className="h-4 w-4 shrink-0" />
          </button>
        </div>
      </div>

      {/* Perfil del Kit / Suscripción */}
      <div className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-3xl p-5 shadow-sm space-y-4">
        
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold tracking-tight text-primary-900 dark:text-primary-50 truncate flex items-center gap-2">
              <Box className="h-6 w-6 text-primary-400" />
              Kit #{subscription.kitNumber}
            </h1>
            <p className="text-sm font-medium text-primary-500 dark:text-primary-400 mt-1">
              Plan: {subscription.plan.name}
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

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-primary-950 border border-primary-100 dark:border-primary-800 flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-200/50 dark:bg-primary-800 flex items-center justify-center text-primary-700 dark:text-primary-300 font-bold shrink-0">
            {subscription.client.firstName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-bold text-primary-900 dark:text-primary-50 truncate">
              {getClientFullName(subscription.client)}
            </p>
            <p className="text-xs text-primary-500 dark:text-primary-400 truncate flex items-center gap-1 mt-0.5">
              <Phone className="h-3 w-3" /> {subscription.client.phone}
            </p>
          </div>
        </div>

        {subscription.accountNumber && (
          <div className="flex items-center gap-2 text-sm text-primary-600 dark:text-primary-400 px-1">
            <Hash className="h-4 w-4 shrink-0" />
            <span>Cuenta Starlink: </span>
            <span className="font-semibold text-primary-900 dark:text-primary-100">{subscription.accountNumber}</span>
          </div>
        )}

      </div>

      {/* Alerta de Vencimiento Próximo */}
      {subscription.currentPeriod && subscription.currentPeriod.status === 'PENDING' && isExpiringSoon(subscription.currentPeriod.endDate) && (
        <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-start gap-3 flex-1">
            <div className="p-2 bg-amber-100 dark:bg-amber-900 rounded-full text-amber-600 dark:text-amber-400 shrink-0">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="font-bold text-amber-800 dark:text-amber-300">
                {getExpiringLabel(subscription.currentPeriod.endDate)}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 font-medium">
                Vence el {formatDate(subscription.currentPeriod.endDate)} • {formatCurrency(subscription.currentPeriod.amount)}
              </p>
            </div>
          </div>
          <Button 
            className="w-full sm:w-auto shrink-0 shadow-sm bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-700 dark:hover:bg-amber-600 h-11" 
            onClick={() => handlePayPeriod(subscription.currentPeriod!)}
            disabled={hasOlderUnpaidPeriod(subscription.currentPeriod!, billingPeriods)}
            title={hasOlderUnpaidPeriod(subscription.currentPeriod!, billingPeriods) ? 'Existen períodos anteriores pendientes o vencidos' : undefined}
          >
            <DollarSign className="h-4 w-4 mr-1 shrink-0" />
            Cobrar Ahora
          </Button>
        </div>
      )}

      {/* Acciones Rápidas */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-14 font-semibold active:scale-95 transition-transform bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300"
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
            <><Pause className="h-5 w-5 mr-2" /> Suspender</>
          ) : (
            <><Play className="h-5 w-5 mr-2" /> Reactivar</>
          )}
        </Button>
        
        <Button
          variant="outline"
          className="h-14 font-semibold active:scale-95 transition-transform bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-primary-700 dark:text-primary-300"
          onClick={handleGenerateNext}
          disabled={generateMutation.isPending}
        >
          <Plus className="h-5 w-5 mr-2 shrink-0" />
          {generateMutation.isPending ? 'Creando...' : 'Crear Período'}
        </Button>
      </div>

      {/* Mini KPIs Horizontales */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar touch-pan-x -mx-4 px-4 snap-x snap-mandatory pt-2">
        <div className="snap-center shrink-0 w-[40vw] min-w-[130px] bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">Pagados ({summary.paidPeriods})</p>
          <p className="text-xl font-bold text-primary-900 dark:text-primary-50 mt-1">{formatCurrency(summary.totalPaid)}</p>
        </div>
        <div className="snap-center shrink-0 w-[40vw] min-w-[130px] bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wide">Pendientes ({summary.pendingPeriods})</p>
          <p className="text-xl font-bold text-primary-900 dark:text-primary-50 mt-1">{formatCurrency(summary.totalPending)}</p>
        </div>
        <div className="snap-center shrink-0 w-[40vw] min-w-[130px] bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-[11px] font-bold text-red-600 dark:text-red-400 uppercase tracking-wide">Vencidos ({summary.overduePeriods})</p>
          <p className="text-xl font-bold text-red-600 dark:text-red-400 mt-1">{summary.overduePeriods}</p>
        </div>
      </div>

      {/* Historial de Facturación (List Tiles) */}
      <div className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-3xl p-2 sm:p-4 shadow-sm mt-2">
        <div className="flex items-center gap-2 p-3 border-b border-primary-100 dark:border-primary-800 mb-2">
          <ListChecks className="h-5 w-5 text-primary-400" />
          <h2 className="text-base font-bold text-primary-900 dark:text-primary-50">Historial de Pagos</h2>
        </div>

        {billingPeriods.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Clock className="h-12 w-12 text-primary-200 dark:text-primary-800 mb-3" />
            <p className="text-primary-600 dark:text-primary-400 font-medium">No hay períodos registrados.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {billingPeriods.map((period) => (
              <div 
                key={period.id} 
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-primary-950 border border-primary-100 dark:border-primary-800/50 gap-4"
              >
                
                <div className="flex items-start gap-3">
                  <div className="shrink-0 pt-1">
                    <Badge className={BILLING_PERIOD_STATUS_COLORS[period.status]}>
                      {BILLING_PERIOD_STATUS_LABELS[period.status]}
                    </Badge>
                  </div>
                  <div>
                    <p className="font-bold text-sm text-primary-900 dark:text-primary-50 leading-tight">
                      {period.periodLabel}
                    </p>
                    <p className="text-[11px] font-medium text-primary-500 dark:text-primary-400 mt-0.5 uppercase tracking-wide">
                      {formatDate(period.startDate)} — {formatDate(period.endDate)}
                    </p>
                    
                    {period.status === 'PAID' && period.paidAt && (
                      <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1">
                        <DollarSign className="h-3 w-3" /> Pagado: {formatDate(period.paidAt)}
                      </p>
                    )}
                    {period.paymentMethod && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[10px] font-bold text-primary-400 dark:text-primary-500 uppercase tracking-wide bg-primary-100 dark:bg-primary-900 px-2 py-0.5 rounded-sm">
                          {PAYMENT_METHOD_LABELS[period.paymentMethod] ?? period.paymentMethod}
                        </span>
                        {period.paymentMethod === 'INITIAL_PAYMENT' && (
                          <span className="text-[10px] font-bold text-blue-700 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/50 px-2 py-0.5 rounded-sm uppercase tracking-wide">
                            Pendiente
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:flex-col gap-3 shrink-0">
                  <p className="font-bold text-lg text-primary-900 dark:text-primary-50 text-right">
                    {formatCurrency(period.amount)}
                  </p>
                  
                  <div className="flex gap-2">
                    {period.status !== 'PAID' ? (
                      <Button
                        size="sm"
                        className="h-10 px-4 bg-primary-800 text-white dark:bg-primary-700 shadow-sm active:scale-95 touch-manipulation font-semibold"
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
                        className="h-10 w-10 p-0 border-primary-200 dark:border-primary-700 bg-white dark:bg-primary-900 active:bg-primary-50 dark:active:bg-primary-800 shadow-sm"
                        onClick={() => handleEditPeriod(period)}
                      >
                        <Edit className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-300" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Componentes Hijos (Modales/Drawers) */}
      <EditPaymentModal
        period={editingPeriod}
        open={!!editingPeriod}
        onOpenChange={(open) => !open && setEditingPeriod(null)}
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
