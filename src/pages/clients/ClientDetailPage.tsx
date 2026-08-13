import { useParams, Link } from 'react-router-dom'
import { useState } from 'react'
import { useClientDetail } from '@/hooks/useClients'
import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Edit, ArrowLeft, Users, AlertTriangle, Trash2, DollarSign } from 'lucide-react'
import { formatCurrency, formatDate, SUBSCRIPTION_STATUS_LABELS, SUBSCRIPTION_STATUS_COLORS, isExpiringSoon, getExpiringLabel } from '@/lib/constants'
import { getClientFullName } from '@/lib/utils'
import { DeleteClientModal } from '@/components/modals/DeleteClientModal'
import type { SubscriptionWithDetails } from '@/types/api'

export function ClientDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data, isLoading, error } = useClientDetail(id!)
  const { openQuickPay } = useUIStore()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

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
        <p className="text-red-600 dark:text-red-400">Error al cargar el cliente</p>
        <Button asChild className="mt-4">
          <Link to="/config/clients">Volver a clientes</Link>
        </Button>
      </div>
    )
  }

  const { client, subscriptions, summary } = data

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

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="shrink-0">
            <Link to="/config/clients">
              <ArrowLeft className="h-5 w-5 shrink-0" />
            </Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground break-words">{getClientFullName(client)}</h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base break-all">
              <span className="block sm:inline">{client.email}</span>
              <span className="hidden sm:inline"> • </span>
              <span className="block sm:inline">{client.phone}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="min-h-10 min-w-10" asChild>
            <Link to={`/config/clients/${id}/edit`} aria-label="Editar cliente">
              <Edit className="h-4 w-4 md:mr-2 shrink-0" />
              <span className="hidden md:inline">Editar</span>
            </Link>
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="min-h-10 min-w-10"
            aria-label="Eliminar cliente"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 className="h-4 w-4 md:mr-2 shrink-0" />
            <span className="hidden md:inline">Eliminar</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4 shrink-0" />
              Total Suscripciones
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{summary.totalSubscriptions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Activas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{summary.activeSubscriptions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Suspendidas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">{summary.suspendedSubscriptions}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Períodos Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{summary.totalOverdue}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="subscriptions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="subscriptions">Suscripciones</TabsTrigger>
          <TabsTrigger value="info">Información</TabsTrigger>
        </TabsList>

        <TabsContent value="subscriptions" className="space-y-4">
          {subscriptions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 shrink-0" />
                <p className="text-muted-foreground">Este cliente no tiene suscripciones</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <Card key={sub.id}>
                  <CardContent className="pt-6">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium text-foreground">Kit #{sub.kitNumber}</p>
                          <Badge className={SUBSCRIPTION_STATUS_COLORS[sub.status]}>
                            {SUBSCRIPTION_STATUS_LABELS[sub.status]}
                          </Badge>
                          {sub.hasDebt && (
                            <Badge variant="destructive">Con deuda</Badge>
                          )}
                          {sub.currentPeriod && sub.currentPeriod.status === 'PENDING' && isExpiringSoon(sub.currentPeriod.endDate) && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-400 dark:border-yellow-800">
                              {getExpiringLabel(sub.currentPeriod.endDate)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-sm text-muted-foreground">
                          <span>Plan: {sub.plan?.name || 'N/D'}</span>
                          <span>{formatCurrency(sub.plan?.price || 0)}/mes</span>
                          <span>Día de corte: {sub.billingDay}</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm">
                          <span className="text-muted-foreground">
                            {sub.totalPeriods} períodos totales
                          </span>
                          {sub.overduePeriods > 0 && (
                            <span className="text-red-600 dark:text-red-400">
                              {sub.overduePeriods} vencidos
                            </span>
                          )}
                          {sub.pendingPeriods > 0 && (
                            <span className="text-yellow-600 dark:text-yellow-400">
                              {sub.pendingPeriods} pendientes
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        {sub.currentPeriod && sub.currentPeriod.status !== 'PAID' && (
                          <Button
                            size="sm"
                            className="gap-2"
                            onClick={() => handlePaySubscription(sub)}
                          >
                            <DollarSign className="h-4 w-4 shrink-0" />
                            <span>Cobrar</span>
                          </Button>
                        )}
                        <Button variant="outline" size="sm" asChild>
                          <Link to={`/subscriptions/${sub.id}`}>Ver Detalle</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="info">
          <Card>
            <CardHeader>
              <CardTitle>Información del Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p className="text-foreground">{client.firstName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Apellido</p>
                <p className="text-foreground">{client.lastName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Correo</p>
                <p className="text-foreground">{client.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Teléfono</p>
                <p className="text-foreground">{client.phone}</p>
              </div>
              {client.address && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Dirección</p>
                  <p className="text-foreground">{client.address}</p>
                </div>
              )}
              {client.notes && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Notas</p>
                  <p className="text-foreground">{client.notes}</p>
                </div>
              )}
              <div>
                <p className="text-sm font-medium text-muted-foreground">Fecha de registro</p>
                <p className="text-foreground">{formatDate(client.createdAt)}</p>
              </div>
            </CardContent>
          </Card>
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
