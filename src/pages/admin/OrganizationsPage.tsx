import { useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizations, useDeleteOrganization } from '@/hooks/useOrganizations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Edit, Trash2, MessageCircle, MessageCircleOff, Link2, Check, ReceiptText } from 'lucide-react'
import { ListPageLayout, ListCard } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'
import { CreateOrganizationSheet } from '@/components/organizations/CreateOrganizationSheet'
import { EditOrganizationSheet } from '@/components/organizations/EditOrganizationSheet'
import { OrganizationPlanPaymentSheet } from '@/components/organizations/OrganizationPlanPaymentSheet'
import { OrganizationAdminsSection } from '@/components/organizations/OrganizationAdminsSection'
import { BUSINESS_PLANS, ORGANIZATION_PLAN_STATUS_LABELS, formatDate } from '@/lib/constants'
import type { Organization, OrganizationListFilter } from '@/types/api'

export function OrganizationsPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null)
  const [paymentOrganization, setPaymentOrganization] = useState<Organization | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const requestedFilter = searchParams.get('filter')
  const planFilter = (['trial-expiring', 'expired', 'near-limit'] as const).find(
    (value) => value === requestedFilter,
  )

  const { data, isLoading } = useOrganizations(
    {
      search: searchParams.get('search') || undefined,
      limit: 50,
      offset: 0,
      filter: planFilter,
    },
    { enabled: isSuperAdmin },
  )

  const deleteMutation = useDeleteOrganization()
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  const handleCopyConsultaLink = async (organization: Organization) => {
    if (!organization.slug) return
    const link = `${window.location.origin}${import.meta.env.BASE_URL}consulta/${organization.slug}`
    try {
      await navigator.clipboard.writeText(link)
      setCopiedSlug(organization.slug)
      setTimeout(() => setCopiedSlug((current) => (current === organization.slug ? null : current)), 2000)
    } catch {
      window.prompt('Copia el enlace de consulta:', link)
    }
  }

  if (!isSuperAdmin) {
    return <Navigate to="/config" replace />
  }

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

  const handleFilter = (filter: OrganizationListFilter | null) => {
    const params = new URLSearchParams(searchParams)
    if (filter) {
      params.set('filter', filter)
    } else {
      params.delete('filter')
    }
    setSearchParams(params)
  }

  const organizations = data?.organizations || []
  const isEmpty = !isLoading && organizations.length === 0

  return (
    <>
      <ListPageLayout
        searchProps={{
          value: search,
          onChange: handleSearch,
          placeholder: 'Buscar por nombre o slug...',
        }}
        filters={
          <div className="flex flex-wrap gap-2">
            <FilterPill active={!planFilter} onClick={() => handleFilter(null)}>
              Todas
            </FilterPill>
            <FilterPill
              active={planFilter === 'trial-expiring'}
              onClick={() => handleFilter(planFilter === 'trial-expiring' ? null : 'trial-expiring')}
            >
              Prueba por vencer
            </FilterPill>
            <FilterPill
              active={planFilter === 'expired'}
              variant="destructive"
              onClick={() => handleFilter(planFilter === 'expired' ? null : 'expired')}
            >
              Vencidas
            </FilterPill>
            <FilterPill
              active={planFilter === 'near-limit'}
              onClick={() => handleFilter(planFilter === 'near-limit' ? null : 'near-limit')}
            >
              Cerca del límite
            </FilterPill>
          </div>
        }
        primaryAction={
          <Button
            onClick={() => setCreateOpen(true)}
            className="h-10 w-10 rounded-full! p-0 sm:h-10 sm:w-auto sm:rounded-md sm:px-4 sm:py-2"
            aria-label="Nueva organización"
            title="Nueva organización"
          >
            <Plus className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 sm:mr-1.5" />
            <span className="hidden sm:inline">Nueva Organización</span>
          </Button>
        }
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyIcon={<Building2 className="h-16 w-16 text-subtle-foreground" />}
        emptyTitle="Sin organizaciones"
        emptyDescription="No encontramos resultados. Modifica los filtros o crea una nueva."
        emptyAction={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            Crear Organización
          </Button>
        }
      >
        <div className="space-y-3">
        {organizations.map((organization) => (
          <ListCard
            key={organization.id}
            className="flex-col"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-foreground">{organization.name}</p>
                  {organization.active ? (
                    <Badge
                      variant="outline"
                      className="text-success bg-success/10 border-success/20"
                    >
                      Activa
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-destructive bg-destructive/10 border-destructive/20"
                    >
                      Inactiva
                    </Badge>
                  )}
                  {organization.plan && (
                    <Badge variant="outline" className="text-info bg-info/10 border-info/20">
                      {BUSINESS_PLANS[organization.plan].label}
                    </Badge>
                  )}
                  {organization.planStatus ? (
                    <Badge
                      variant="outline"
                      className={
                        organization.planStatus === 'activo'
                          ? 'text-success bg-success/10 border-success/20'
                          : organization.planStatus === 'prueba'
                            ? 'text-info bg-info/10 border-info/20'
                            : 'text-warning bg-warning/10 border-warning/20'
                      }
                    >
                      {ORGANIZATION_PLAN_STATUS_LABELS[organization.planStatus]}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-warning bg-warning/10 border-warning/20">
                      Plan pendiente
                    </Badge>
                  )}
                  {organization.twilioConfigured ? (
                    <Badge
                      variant="outline"
                      className="text-info bg-info/10 border-info/20"
                    >
                      <MessageCircle className="h-3 w-3 mr-1 shrink-0" />
                      WhatsApp
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="text-warning bg-warning/10 border-warning/20"
                    >
                      <MessageCircleOff className="h-3 w-3 mr-1 shrink-0" />
                      Sin WhatsApp
                    </Badge>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                  {organization.slug && <span className="font-medium">{organization.slug}</span>}
                  <span className="text-xs">
                    Creada: {new Date(organization.createdAt).toLocaleDateString('es-ES')}
                  </span>
                  {organization.clientCount !== undefined && organization.clientLimit !== undefined ? (
                    <span className="text-xs font-medium">
                      Uso: {organization.clientCount} de {organization.clientLimit} clientes
                    </span>
                  ) : (
                    <span className="text-xs">Uso no disponible</span>
                  )}
                  {organization.planStatus === 'prueba' && organization.trialEndsAt && (
                    <span className="text-xs">
                      Fin de prueba: {formatDate(organization.trialEndsAt)}
                    </span>
                  )}
                  {organization.planExpiresAt && organization.planStatus === 'activo' && (
                    <span className="text-xs">
                      Vencimiento: {formatDate(organization.planExpiresAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                {organization.slug && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleCopyConsultaLink(organization)}
                  title={`Copiar link de consulta (/consulta/${organization.slug})`}
                  aria-label={`Copiar link de consulta de ${organization.name}`}
                >
                  {copiedSlug === organization.slug ? (
                    <Check className="h-4 w-4 shrink-0 text-success" />
                  ) : (
                    <Link2 className="h-4 w-4 shrink-0" />
                  )}
                </Button>
                )}
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setPaymentOrganization(organization)}
                  title="Registrar pago del plan"
                  aria-label={`Registrar pago del plan de ${organization.name}`}
                >
                  <ReceiptText className="h-4 w-4 shrink-0" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditingOrganization(organization)}
                  aria-label={`Editar organización ${organization.name}`}
                >
                  <Edit className="h-4 w-4 shrink-0" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    if (
                      confirm(
                        `¿Eliminar la organización ${organization.name}? Se eliminarán todos sus datos: usuarios, clientes, planes, suscripciones, períodos y mensajes de WhatsApp. Esta acción es irreversible.`,
                      )
                    ) {
                      deleteMutation.mutate(organization.id)
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  aria-label={`Eliminar organización ${organization.name}`}
                >
                  <Trash2 className="h-4 w-4 text-destructive shrink-0" />
                </Button>
              </div>
            </div>
            <OrganizationAdminsSection
              organizationId={organization.id}
              organizationName={organization.name}
            />
          </ListCard>
        ))}
      </div>
      </ListPageLayout>

      <CreateOrganizationSheet open={createOpen} onOpenChange={setCreateOpen} />

      <EditOrganizationSheet
        organization={editingOrganization!}
        open={!!editingOrganization}
        onOpenChange={(open) => !open && setEditingOrganization(null)}
      />
      {paymentOrganization && (
        <OrganizationPlanPaymentSheet
          organization={paymentOrganization}
          open={!!paymentOrganization}
          onOpenChange={(open) => !open && setPaymentOrganization(null)}
        />
      )}
    </>
  )
}
