import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useClientDetail } from '@/hooks/useClients'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, Trash2, DollarSign, Phone, Mail, Box, Calendar, AlertTriangle, MessageSquare, MapPin, AlignLeft, ShieldAlert } from 'lucide-react'
import { formatCurrency, formatDate, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName, getInitial, canPayCurrentPeriod } from '@/lib/utils'
import { DeleteClientModal } from '@/components/modals/DeleteClientModal'
import { DetailNav } from '@/components/design-system/DetailNav'
import { EmptyState } from '@/components/design-system/EmptyState'
import type { SubscriptionWithDetails } from '@/types/api'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useClientDetail(id!)
  const { openQuickPay } = useUIStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  if (isLoading) {
    return (
      <div className="space-y-4 px-2">
        <div className="h-20 bg-primary-100 dark:bg-primary-900 rounded-2xl animate-pulse mb-6" />
        <div className="flex gap-2">
          {[1, 2].map((i) => <div key={i} className="h-24 flex-1 bg-primary-100 dark:bg-primary-900 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-10 w-full bg-primary-100 dark:bg-primary-900 rounded-lg animate-pulse my-4" />
        {[1, 2].map((i) => (
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
        <h2 className="text-xl font-bold text-primary-900 dark:text-primary-50">Error al cargar cliente</h2>
        <p className="text-primary-500 dark:text-primary-400 mt-2 mb-6">No pudimos obtener los datos del cliente solicitado.</p>
        <Button asChild>
          <Link to="/clients">Volver a Clientes</Link>
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
          client: { id: client.id, firstName: client.firstName, lastName: client.lastName, phone: client.phone, email: client.email },
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
        backTo="/clients"
        actions={
          <>
            <Button variant="outline" size="icon" asChild className="rounded-full bg-white dark:bg-primary-900 border-primary-100 dark:border-primary-800 text-primary-600 dark:text-primary-300 shadow-sm">
              <Link to={`/clients/${id}/edit`}>
                <Edit className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowDeleteModal(true)} className="rounded-full bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 shadow-sm">
              <Trash2 className="h-4 w-4 shrink-0" />
            </Button>
          </>
        }
      />

      {/* Perfil del Cliente */}
      <div className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-3xl p-5 shadow-sm">
        <div className="flex gap-4 items-center">
          <div className="flex items-center justify-center h-16 w-16 rounded-full bg-secondary-100 text-secondary-700 font-bold text-2xl shrink-0 dark:bg-secondary-900/30 dark:text-secondary-400">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-primary-900 dark:text-primary-50 truncate leading-tight">
              {getClientFullName(client)}
            </h1>
            <div className="flex flex-col gap-1 mt-1 text-sm text-primary-500 dark:text-primary-400">
              <span className="flex items-center gap-1.5 truncate">
                <Phone className="h-3.5 w-3.5 shrink-0" /> {client.phone}
              </span>
              <span className="flex items-center gap-1.5 truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" /> {client.email}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-5">
          <button 
            onClick={handleOpenChat}
            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl font-semibold text-green-700 bg-green-50 border border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-900 active:bg-green-100 dark:active:bg-green-900/50 touch-manipulation transition-colors"
          >
            <MessageSquare className="h-4 w-4" /> WhatsApp
          </button>
        </div>
      </div>

      {/* Mini KPIs Horizontales */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar touch-pan-x -mx-4 px-4 snap-x snap-mandatory">
        <div className="snap-center shrink-0 w-[45vw] min-w-[140px] bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-xs font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-wide">Activas</p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{summary.activeSubscriptions}</p>
        </div>
        <div className="snap-center shrink-0 w-[45vw] min-w-[140px] bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-xs font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-wide">Deuda</p>
          <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.totalOverdue}</p>
        </div>
        <div className="snap-center shrink-0 w-[45vw] min-w-[140px] bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl p-4 flex flex-col justify-center">
          <p className="text-xs font-semibold text-primary-500 dark:text-primary-400 uppercase tracking-wide">Total Subs</p>
          <p className="text-2xl font-bold text-primary-900 dark:text-primary-50">{summary.totalSubscriptions}</p>
        </div>
      </div>

      <Tabs defaultValue="subscriptions" className="mt-2">
        <TabsList className="w-full grid grid-cols-2 h-12 bg-primary-100/50 dark:bg-primary-900/30 rounded-xl p-1 border border-primary-200/50 dark:border-primary-800/50">
          <TabsTrigger value="subscriptions" className="rounded-lg font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-primary-800">Suscripciones</TabsTrigger>
          <TabsTrigger value="info" className="rounded-lg font-semibold data-[state=active]:bg-white dark:data-[state=active]:bg-primary-800">Información</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-4 space-y-4">
          {subscriptions.length === 0 ? (
            <EmptyState
              icon={<Box className="h-12 w-12 text-primary-200 dark:text-primary-800" />}
              title="Este cliente no tiene suscripciones"
            />
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl p-4 shadow-sm overflow-hidden relative">
                  
                  {/* Etiqueta Deuda / Vencido (Si aplica) */}
                  {sub.hasDebt && (
                    <div className="absolute top-0 right-0 bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1 uppercase tracking-wide">
                      <ShieldAlert className="h-3 w-3" /> Con Deuda
                    </div>
                  )}

                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-xl bg-primary-50 dark:bg-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-300">
                      <Box className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-primary-900 dark:text-primary-50 leading-tight">
                        Kit #{sub.kitNumber}
                      </p>
                      <p className="text-xs text-primary-500 dark:text-primary-400 font-medium mt-0.5">
                        {sub.plan?.name || 'N/D'} • {formatCurrency(sub.plan?.price || 0)}/mes
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    <Badge className={SUBSCRIPTION_STATUS_COLORS[sub.status]}>
                      {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                    </Badge>
                    <Badge variant="outline" className="bg-white dark:bg-primary-900 border-primary-200 dark:border-primary-700 text-primary-600 dark:text-primary-300">
                      Corte: día {sub.billingDay}
                    </Badge>
                    {sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate) && (
                      <Badge className="bg-amber-100 text-amber-700 border-transparent dark:bg-amber-950 dark:text-amber-400">
                        {getExpiringLabel(sub.currentPeriod.endDate)}
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-slate-50 dark:bg-primary-950/30 rounded-xl border border-primary-100 dark:border-primary-800/50">
                    <div className="text-center border-r border-primary-200 dark:border-primary-800">
                      <p className="text-[10px] font-bold text-primary-400 uppercase">Vencidos</p>
                      <p className={`text-lg font-bold leading-none mt-1 ${sub.overduePeriods > 0 ? 'text-red-600 dark:text-red-400' : 'text-primary-900 dark:text-primary-50'}`}>
                        {sub.overduePeriods}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold text-primary-400 uppercase">Totales</p>
                      <p className="text-lg font-bold leading-none mt-1 text-primary-900 dark:text-primary-50">
                        {sub.totalPeriods}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sub.currentPeriod && sub.currentPeriod.status !== 'PAID' && (
                      <Button
                        className="flex-1 h-11 text-sm font-semibold bg-primary-800 hover:bg-primary-900 text-white dark:bg-primary-700 active:scale-95 touch-manipulation"
                        onClick={() => handlePaySubscription(sub)}
                        disabled={!canPayCurrentPeriod(sub)}
                        title={!canPayCurrentPeriod(sub) ? 'Existen períodos anteriores pendientes o vencidos' : undefined}
                      >
                        <DollarSign className="h-4 w-4 mr-1 shrink-0" />
                        Cobrar
                      </Button>
                    )}
                    <Button variant="outline" className={`h-11 font-semibold border-primary-200 dark:border-primary-700 active:bg-primary-50 dark:active:bg-primary-800 transition-colors ${sub.currentPeriod && sub.currentPeriod.status !== 'PAID' ? 'flex-none px-4' : 'flex-1'}`} asChild>
                      <Link to={`/subscriptions/${sub.id}`}>Ver Kit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info">
          <div className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl p-5 space-y-4 shadow-sm">
            
            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-primary-500 uppercase tracking-wide">Dirección</p>
                <p className="text-sm text-primary-900 dark:text-primary-100 font-medium mt-0.5 leading-snug">
                  {client.address || <span className="text-primary-400 italic font-normal">Sin especificar</span>}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-primary-500 uppercase tracking-wide">Registro</p>
                <p className="text-sm text-primary-900 dark:text-primary-100 font-medium mt-0.5">
                  {formatDate(client.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <AlignLeft className="h-5 w-5 text-primary-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-primary-500 uppercase tracking-wide">Notas</p>
                <p className="text-sm text-primary-900 dark:text-primary-100 font-medium mt-0.5 leading-snug">
                  {client.notes || <span className="text-primary-400 italic font-normal">Sin notas adicionales</span>}
                </p>
              </div>
            </div>

          </div>
        </TabsContent>
      </Tabs>

      <DeleteClientModal
        clientId={id!}
        clientName={getClientFullName(client)}
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
      />
    </div>
  )
}
