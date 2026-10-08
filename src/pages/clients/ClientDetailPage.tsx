import { useParams, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useClientDetail } from '@/hooks/useClients'
import { useOrganizationDetail } from '@/hooks/useOrganizations'
import { useUIStore } from '@/stores/ui.store'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, Trash2, DollarSign, Phone, Mail, Box, Calendar, AlertTriangle, MessageSquare, MapPin, AlignLeft, ShieldAlert, CreditCard, Plus, Link2, Check } from 'lucide-react'
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
  const navigate = useNavigate()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)
  const { data, isLoading, error } = useClientDetail(id!, organizationId || undefined, {
    enabled: !isSuperAdmin || !!organizationId,
  })
  const {
    data: organizationData,
    isLoading: isLoadingOrganization,
    isError: organizationError,
  } = useOrganizationDetail(data?.client.organizationId ?? '')
  const { openQuickPay } = useUIStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [advanceSub, setAdvanceSub] = useState<SubscriptionWithDetails | null>(null)
  const [consultaLinkCopied, setConsultaLinkCopied] = useState(false)

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
  const organizationSlug = organizationData?.organization.slug
  const consultationUrl = organizationSlug
    ? `${window.location.origin}${import.meta.env.BASE_URL}consulta/${encodeURIComponent(organizationSlug)}`
    : null

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
      navigate(`/chats?phone=${encodeURIComponent(client.phone)}`)
    }
  }

  const handleCopyConsultationLink = async () => {
    if (!consultationUrl) return

    try {
      await navigator.clipboard.writeText(consultationUrl)
      setConsultaLinkCopied(true)
      window.setTimeout(() => setConsultaLinkCopied(false), 2000)
    } catch {
      window.prompt('Copia el enlace de consulta:', consultationUrl)
    }
  }

  return (
    <div className="flex flex-col gap-3 pb-[calc(100px+env(safe-area-inset-bottom))] sm:gap-4">
      
      <DetailNav
        className="mb-2"
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
            <Button variant="outline" size="icon" asChild className="rounded-full bg-surface text-surface-foreground border-border shadow-sm" aria-label="Editar cliente" title="Editar cliente">
              <Link to={`/subscriptions/clients/${id}/edit`} aria-label="Editar cliente">
                <Edit className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button variant="outline" size="icon" onClick={() => setShowDeleteModal(true)} className="rounded-full shadow-sm" aria-label="Eliminar cliente" title="Eliminar cliente">
              <Trash2 className="h-4 w-4 shrink-0" />
            </Button>
          </>
        }
      />

      {/* Perfil del Cliente */}
      <div className="bg-surface text-surface-foreground border border-border rounded-2xl p-3 shadow-sm sm:rounded-3xl sm:p-5">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xl font-bold text-surface-muted-foreground sm:h-16 sm:w-16 sm:text-2xl">
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold leading-tight text-foreground">
              {getClientFullName(client)}
            </h1>
            <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground sm:gap-1 sm:text-sm">
              <span className="flex items-center gap-1.5 truncate">
                <Phone className="h-3.5 w-3.5 shrink-0" /> {client.phone}
              </span>
              {client.dni && (
                <span className="flex items-center gap-1.5 truncate">
                  <CreditCard className="h-3.5 w-3.5 shrink-0" /> C.I. {client.dni}
                </span>
              )}
              {client.email && (
                <span className="flex items-center gap-1.5 truncate">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> {client.email}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-5">
          <button
            onClick={handleOpenChat}
            disabled={!client.phone}
            aria-label="Abrir chat de WhatsApp"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-border-subtle bg-surface-muted font-semibold text-surface-muted-foreground transition-colors hover:bg-surface-hover active:bg-surface-active touch-manipulation disabled:opacity-50 sm:h-11"
          >
            <MessageSquare className="h-4 w-4" /> Abrir WhatsApp
          </button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCopyConsultationLink}
            disabled={!consultationUrl || isLoadingOrganization}
            aria-label={consultaLinkCopied ? 'Enlace de consulta copiado' : 'Copiar enlace de consulta'}
            title={
              organizationError
                ? 'No se pudo cargar el enlace de consulta'
                : !organizationSlug && !isLoadingOrganization
                  ? 'La organización no tiene un enlace de consulta'
                  : 'Copiar enlace de consulta'
            }
            className="h-10 gap-2 px-2 text-xs sm:h-11 sm:px-3 sm:text-sm"
          >
            {consultaLinkCopied ? <Check className="h-4 w-4 shrink-0" /> : <Link2 className="h-4 w-4 shrink-0" />}
            {consultaLinkCopied ? 'Copiado' : 'Copiar enlace'}
          </Button>
        </div>
        {organizationError && (
          <p role="status" className="mt-2 text-xs text-destructive">
            No se pudo cargar el enlace de consulta de la organización.
          </p>
        )}
      </div>

      {/* Mini KPIs Horizontales */}
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto px-4 no-scrollbar touch-pan-x -mx-4 sm:gap-3">
        <div className="flex w-[40vw] min-w-31.25 shrink-0 snap-center flex-col justify-center rounded-xl border border-border bg-surface p-2.5 text-surface-foreground sm:w-[45vw] sm:min-w-35 sm:rounded-2xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">Activas</p>
          <p className="text-xl font-bold leading-tight text-success sm:text-2xl">{summary.activeSubscriptions}</p>
        </div>
        <div className="flex w-[40vw] min-w-31.25 shrink-0 snap-center flex-col justify-center rounded-xl border border-border bg-surface p-2.5 text-surface-foreground sm:w-[45vw] sm:min-w-35 sm:rounded-2xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">Deuda</p>
          <p className="text-xl font-bold leading-tight text-destructive sm:text-2xl">{summary.totalOverdue}</p>
        </div>
        <div className="flex w-[40vw] min-w-31.25 shrink-0 snap-center flex-col justify-center rounded-xl border border-border bg-surface p-2.5 text-surface-foreground sm:w-[45vw] sm:min-w-35 sm:rounded-2xl sm:p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground sm:text-xs">Total Subs</p>
          <p className="text-xl font-bold leading-tight text-foreground sm:text-2xl">{summary.totalSubscriptions}</p>
        </div>
      </div>

      <Tabs defaultValue="subscriptions" className="mt-1 sm:mt-2">
        <TabsList className="grid h-11 w-full grid-cols-2 rounded-xl border border-border-subtle bg-surface-muted p-1 sm:h-12">
          <TabsTrigger value="subscriptions" className="rounded-lg font-semibold data-[state=active]:bg-surface data-[state=active]:text-surface-foreground data-[state=active]:shadow-sm">Suscripciones</TabsTrigger>
          <TabsTrigger value="info" className="rounded-lg font-semibold data-[state=active]:bg-surface data-[state=active]:text-surface-foreground data-[state=active]:shadow-sm">Información</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="mt-3 space-y-3 sm:mt-4 sm:space-y-4">
          {subscriptions.length === 0 ? (
            <EmptyState
              icon={<Box className="h-12 w-12 text-subtle-foreground" />}
              title="Este cliente no tiene suscripciones"
            />
          ) : (
            <div className="space-y-2 sm:space-y-3">
              {subscriptions.map((sub) => (
                <div key={sub.id} className="relative overflow-hidden rounded-xl border border-border bg-surface p-3 text-surface-foreground shadow-sm sm:rounded-2xl sm:p-4">

                  <div className="mb-2 flex items-center gap-2.5 sm:mb-3 sm:gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary sm:h-10 sm:w-10 sm:rounded-xl">
                      <Box className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold leading-tight text-foreground">
                        {sub.accountNumber ? sub.accountNumber : sub.kitNumber}
                      </p>
                      <p className="mt-0.5 truncate text-xs font-medium text-muted-foreground">
                        {sub.accountNumber ? `${sub.kitNumber} • ` : ''}{sub.plan?.name || 'N/D'} • {formatCurrency(sub.plan?.price || 0)}/mes
                      </p>
                    </div>
                    {sub.hasDebt && (
                      <Badge variant="destructive" className="shrink-0 gap-1 px-2 py-0.5 text-[10px]">
                        <ShieldAlert className="h-3 w-3" /> Deuda
                      </Badge>
                    )}
                  </div>

                  <div className="mb-2 flex flex-wrap gap-1.5 sm:mb-3 sm:gap-2">
                    <Badge className={`px-2 py-0.5 text-[10px] sm:text-xs ${SUBSCRIPTION_STATUS_COLORS[sub.status]}`}>
                      {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                    </Badge>
                    <Badge variant="outline" className="border-border bg-surface-muted px-2 py-0.5 text-[10px] text-muted-foreground sm:text-xs">
                      Corte: día {sub.billingDay}
                    </Badge>
                    {sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate) && (
                      <Badge className="border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] text-warning sm:text-xs">
                        {getExpiringLabel(sub.currentPeriod.endDate)}
                      </Badge>
                    )}
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-1.5 rounded-lg border border-border-subtle bg-surface-muted p-1.5 sm:mb-3 sm:gap-2 sm:rounded-xl sm:p-2.5">
                    <div className="border-r border-border text-center">
                      <p className="text-[10px] font-bold uppercase text-subtle-foreground">Vencidos</p>
                      <p className={`mt-0.5 text-base font-bold leading-none sm:mt-1 sm:text-lg ${sub.overduePeriods > 0 ? 'text-destructive' : 'text-foreground'}`}>
                        {sub.overduePeriods}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-[10px] font-bold uppercase text-subtle-foreground">Totales</p>
                      <p className="mt-0.5 text-base font-bold leading-none text-foreground sm:mt-1 sm:text-lg">
                        {sub.totalPeriods}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {sub.currentPeriod && sub.currentPeriod.status !== 'PAID' && (
                      <Button
                        className="h-9 min-w-0 flex-1 gap-1 px-2 text-xs font-semibold sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
                        onClick={() => handlePaySubscription(sub)}
                        disabled={!canPayCurrentPeriod(sub)}
                        title={!canPayCurrentPeriod(sub) ? 'Existen períodos anteriores pendientes o vencidos' : undefined}
                      >
                        <DollarSign className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                        Cobrar
                      </Button>
                    )}
                    {canPayAdvance(sub) && (
                      <Button
                        variant="outline"
                        className="h-9 min-w-0 flex-1 gap-1 px-2 text-xs font-semibold sm:h-11 sm:gap-2 sm:px-4 sm:text-sm"
                        onClick={() => setAdvanceSub(sub)}
                        title="Pagar por adelantado"
                      >
                        <DollarSign className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
                        Adelanto
                      </Button>
                    )}
                    <Button variant="outline" className="h-9 min-w-0 flex-1 px-2 text-xs font-semibold transition-colors active:bg-surface-active sm:h-11 sm:px-4 sm:text-sm" asChild>
                      <Link to={`/subscriptions/${sub.id}`} state={{ from: `${location.pathname}${location.search}` }}>Ver Kit</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info">
          <div className="space-y-3 rounded-2xl border border-border bg-surface p-3 text-surface-foreground shadow-sm sm:space-y-4 sm:p-5">

            <div className="flex items-start gap-2.5 sm:gap-3">
              <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Cédula de Identidad</p>
                <p className="text-sm text-foreground font-medium mt-0.5 leading-snug">
                  {client.dni || <span className="text-subtle-foreground italic font-normal">Sin especificar</span>}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Dirección</p>
                <p className="text-sm text-foreground font-medium mt-0.5 leading-snug">
                  {client.address || <span className="text-subtle-foreground italic font-normal">Sin especificar</span>}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
              <div>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">Registro</p>
                <p className="text-sm text-foreground font-medium mt-0.5">
                  {formatDate(client.createdAt)}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 sm:gap-3">
              <AlignLeft className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground sm:h-5 sm:w-5" />
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
