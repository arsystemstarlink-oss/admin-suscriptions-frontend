import { useParams, Link, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useClientDetail } from '@/hooks/useClients'
import { useUIStore } from '@/stores/ui.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, Trash2, DollarSign, Phone, Mail, Box, Calendar, AlertTriangle, MessageSquare, MapPin, AlignLeft, ShieldAlert, CreditCard, Plus } from 'lucide-react'
import { formatCurrency, formatDate, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName, getInitial, canPayCurrentPeriod, canPayAdvance } from '@/lib/utils'
import { DeleteClientSheet } from '@/components/modals/DeleteClientSheet'
import { PayAdvanceSheet } from '@/components/payment/PayAdvanceSheet'
import { DetailNav } from '@/components/design-system/DetailNav'
import { EmptyState } from '@/components/design-system/EmptyState'
import type { SubscriptionWithDetails } from '@/types/api'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const { data, isLoading, error } = useClientDetail(id!, organizationId || undefined, {
    enabled: !isSuperAdmin || !!organizationId,
  })
  const { openQuickPay } = useUIStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [advanceSub, setAdvanceSub] = useState<SubscriptionWithDetails | null>(null)

  if (isLoading) {
    return (
      <div className="space-y-4 px-2">
        <div className="h-20 bg-muted rounded-2xl animate-pulse mb-6" />
        <div className="flex gap-2">
          {[1, 2].map((i) => <div key={i} className="h-24 flex-1 bg-muted rounded-xl animate-pulse" />)}
        </div>
        <div className="h-10 w-full bg-muted rounded-lg animate-pulse my-4" />
        {[1, 2].map((i) => (
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
        <h2 className="text-xl font-bold text-foreground">Error al cargar cliente</h2>
        <p className="text-muted-foreground mt-2 mb-6">No pudimos obtener los datos del cliente solicitado.</p>
        <Button asChild>
          <Link to="/subscriptions/clients">Volver a Clientes</Link>
        </Button>
      </div>
    )
  }

  const { client, subscriptions, summary } = data
  const initial = getInitial(client.firstName)

  const handlePaySubscription = (sub: SubscriptionWithDetails) => {
    if (sub.currentPeriod && sub.currentPeriod.status !== 'PAID') {
      openQuickPay({
        period: {
          ...sub.currentPeriod,
          subscription: { id: sub.id, kitNumber: sub.kitNumber, status: sub.status },
          client: { id: client.id, firstName: client.firstName, lastName: client.lastName, phone: client.phone, dni: client.dni, email: client.email },
          plan: sub.plan,
        },
      })
    }
  }

  const handleOpenChat = () => {
    if (client.phone) {
      window.open(`/chats?phone=${encodeURIComponent(client.phone)}`, '_blank')
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-[calc(100px+env(safe-area-inset-bottom))]">
      
      <DetailNav
        backTo="/subscriptions/clients"
        actions={
          <>
            <Button
              asChild
              className="h-10 w-10 rounded-full! p-0 shadow-sm sm:w-auto sm:rounded-md sm:px-4 sm:py-2"
              aria-label="Nueva suscripción"
              title="Nueva suscripción"
            >
              <Link to={`/subscriptions/new?clientId=${id}`}>
                <Plus className="h-5 w-5 shrink-0 sm:mr-1.5 sm:h-4 sm:w-4" />
                <span className="hidden sm:inline">Nueva Suscripción</span>
              </Link>
            </Button>
            <Button variant="outline" size="icon" asChild className="rounded-full bg-surface text-surface-foreground border-border shadow-sm">
              <Link to={`/subscriptions/clients/${id}/edit`}>
                <Edit className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowDeleteModal(true)} className="rounded-full shadow-sm">
              <Trash2 className="h-4 w-4 shrink-0" />
            </Button>
          </>
        }
      />

      {/* Perfil del Cliente */}
      <div className="bg-surface text-surface-foreground border border-border rounded-3xl p-5 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-muted text-surface-muted-foreground font-bold text-2xl shrink-0">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground truncate leading-tight">
              {getClientFullName(client)}
            </h1>
            <div className="flex flex-col gap-1 mt-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5 truncate">
                <Phone className="h-3.5 w-3.5 shrink-0" /> {client.phone}
              </span>
              {client.dni && (
                <span className="flex items-center gap-1.5 truncate">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" /> C.I. {client.dni}
                </span>
              )}
              <span className="flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" /> {client.email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button
            onClick={handleOpenChat}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-semibold bg-surface-muted text-surface-muted-foreground border border-border-subtle hover:bg-surface-hover active:bg-surface-active touch-manipulation transition-colors"
          >
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Mini KPIs Horizontales */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar touch-pan-x -mx-4 px-4 snap-x snap-mandatory">
        <div className="snap-center shrink-0 w-[45vw] min-w-[140px] bg-surface text-surface-foreground border border-border rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activas</p>
          <p className="text-2xl font-bold text-success">{summary.activeSubscriptions}</p>
        </div>
        <div className="snap-center shrink-0 w-[45vw] min-w-[140px] bg-surface text-surface-foreground border border-border rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Deuda</p>
          <p className="text-2xl font-bold text-destructive">{summary.totalOverdue}</p>
        </div>
        <div className="snap-center shrink-0 w-[45vw] min-w-[140px] bg-surface text-surface-foreground border border-border rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total Subs</p>
          <p className="text-2xl font-bold text-foreground">{summary.totalSubscriptions}</p>
        </div>
      </div>

      <Tabs defaultValue="subscriptions" className="mt-2">
        <TabsList className="w-full grid grid-cols-2 h-12 bg-surface-muted rounded-xl p-1 border border-border-subtle">
          <TabsTrigger value="subscriptions" className="rounded-lg font-semibold data-[state=active]:bg-surface data-[state=active]:text-surface-foreground data-[state=active]:shadow-sm">Suscripciones</TabsTrigger>
          <TabsTrigger value="info" className="rounded-lg font-semibold data-[state=active]:bg-surface data-[state=active]:text-surface-foreground data-[state=active]:shadow-sm">Información</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4 space-y-4">
          {subscriptions.length === 0 ? (
            <EmptyState
              icon={<Box className="h-12 w-12 text-subtle-foreground" />}
              title="Este cliente no tiene suscripciones"
            />
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="bg-surface text-surface-foreground border border-border rounded-2xl p-4 shadow-sm overflow-hidden relative">

                  {/* Etiqueta Deuda / Vencido (Si aplica) */}
                  {sub.hasDebt && (
                    <div className="absolute top-0 right-0 bg-destructive/10 text-destructive text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 uppercase tracking-wide">
                      <ShieldAlert className="h-3 w-3" /> Con Deuda
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                      <Box className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground leading-tight truncate">
                        {sub.accountNumber ? sub.accountNumber : sub.kitNumber}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium mt-0.5 truncate">
                        {sub.accountNumber ? `${sub.kitNumber} • ` : ''}{sub.plan?.name || 'N/D'} • {formatCurrency(sub.plan?.price || 0)}/mes
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={SUBSCRIPTION_STATUS_COLORS[sub.status]}>
                      {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                    </Badge>
                    <Badge variant="outline" className="bg-surface-muted border-border text-muted-foreground">
                      Corte: día {sub.billingDay}
                    </Badge>
                    {sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate) && (
                      <Badge className="bg-warning/10 text-warning border-warning/20">
                        {getExpiringLabel(sub.currentPeriod.endDate)}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-surface-muted rounded-xl border border-border-subtle">
                    <div className="text-center border-r border-border">
                      <p className="text-[10px] font-bold text-subtle-foreground uppercase">Vencidos</p>
                      <p className={`text-lg font-bold leading-none mt-1 ${sub.overduePeriods > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {sub.overduePeriods}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-subtle-foreground uppercase">Totales</p>
                      <p className="text-lg font-bold leading-none mt-1 text-foreground">
                        {sub.totalPeriods}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sub.currentPeriod && sub.currentPeriod.status !== 'PAID' && (
                      <Button
                        className="flex-1 h-11 text-sm font-semibold"
                        onClick={() => handlePaySubscription(sub)}
                        disabled={!canPayCurrentPeriod(sub)}
                        title={!canPayCurrentPeriod(sub) ? 'Existen períodos anteriores pendientes o vencidos' : undefined}
                      >
                        <DollarSign className="h-4 w-4 mr-1 shrink-0" />
                        Cobrar
                      </Button>
                    )}
                    {canPayAdvance(sub) && (
                      <Button
                        variant="outline"
                        className="flex-1 h-11 text-sm font-semibold"
                        onClick={() => setAdvanceSub(sub)}
                        title="Pagar por adelantado"
                      >
                        Adelanto
                      </Button>
                    )}
                    <Button variant="outline" className={`h-11 font-semibold active:bg-surface-active transition-colors ${(sub.currentPeriod && sub.currentPeriod.status !== 'PAID') || canPayAdvance(sub) ? 'flex-none px-4' : 'flex-1'}`} asChild>
                      <Link to={`/subscriptions/${sub.id}`} state={{ from: `${location.pathname}${location.search}` }}>Ver Kit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info">
          <div className="bg-surface text-surface-foreground border border-border rounded-2xl p-5 space-y-4 shadow-sm">

            <div className="flex items-start gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Cédula de Identidad</p>
                <p className="text-sm text-foreground font-medium mt-0.5 leading-snug">
                  {client.dni || <span className="text-subtle-foreground italic font-normal">Sin especificar</span>}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Dirección</p>
                <p className="text-sm text-foreground font-medium mt-0.5 leading-snug">
                  {client.address || <span className="text-subtle-foreground italic font-normal">Sin especificar</span>}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Registro</p>
                <p className="text-sm text-foreground font-medium mt-0.5">
                  {formatDate(client.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlignLeft className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Notas</p>
                <p className="text-sm text-foreground font-medium mt-0.5 leading-snug">
                  {client.notes || <span className="text-subtle-foreground italic font-normal">Sin notas adicionales</span>}
                </p>
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>

      <DeleteClientSheet
        clientId={id!}
        clientName={getClientFullName(client)}
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
      />
      <PayAdvanceSheet
        subscription={advanceSub}
        open={!!advanceSub}
        onOpenChange={(open) => !open && setAdvanceSub(null)}
      />
    </div>
  )
}
