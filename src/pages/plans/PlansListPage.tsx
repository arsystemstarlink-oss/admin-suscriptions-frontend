import { useState } from 'react'
import { Link, useSearchParams, useNavigate, useLocation } from 'react-router-dom'
import { usePlans, useUpdatePlan } from '@/hooks/usePlans'
import { useOrganizationStore } from '@/stores/organization.store'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Edit, Trash2, Plus, RotateCcw } from 'lucide-react'
import { formatCurrency } from '@/lib/constants'
import { toast } from 'sonner'
import { getErrorMessage } from '@/lib/error-handler'
import { DeletePlanSheet } from '@/components/modals/DeletePlanSheet'
import { ListPageLayout, ListCard } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'
import { OrganizationSelectionEmptyState } from '@/components/organizations/OrganizationSelectionEmptyState'

export function PlansListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const navigate = useNavigate()
  const location = useLocation()
  const isSuperAdmin = useIsSuperAdmin()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)

  const activeFilter = searchParams.get('active')
  const { data, isLoading, isError, isFetching, refetch } = usePlans({
    search: searchParams.get('search') || undefined,
    active: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
    organizationId: organizationId ?? undefined,
  }, { enabled: !isSuperAdmin || !!organizationId })

  const updateMutation = useUpdatePlan()

  const handleSearch = (value: string) => {
    setSearch(value)
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('search', value)
    } else {
      params.delete('search')
    }
    setSearchParams(params, { replace: true })
  }

  const handleFilter = (value: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('active', value)
    } else {
      params.delete('active')
    }
    setSearchParams(params)
  }

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, data: { active: !currentActive } })
      toast.success(currentActive ? 'Plan desactivado' : 'Plan activado')
    } catch (err) {
      toast.error(getErrorMessage(err, 'No se pudo cambiar el estado del plan'))
    }
  }

  const isEmpty = !data || data.plans.length === 0
  const showEmpty = isSuperAdmin && !organizationId
  const hasActiveFilters = Boolean(search || activeFilter)

  const clearFilters = () => {
    setSearch('')
    setSearchParams({})
  }

  return (
    <ListPageLayout
      searchProps={{
        value: search,
        onChange: handleSearch,
        placeholder: "Buscar por nombre o descripción...",
      }}
      filters={!showEmpty ? (
        <>
          <FilterPill active={activeFilter === 'true'} onClick={() => handleFilter(activeFilter === 'true' ? null : 'true')}>
            Activos
          </FilterPill>
          <FilterPill active={activeFilter === 'false'} onClick={() => handleFilter(activeFilter === 'false' ? null : 'false')}>
            Inactivos
          </FilterPill>
        </>
      ) : undefined}
      primaryAction={!showEmpty ? (
        <Button
          onClick={() => navigate('/subscriptions/plans/new', {
            state: { returnTo: `${location.pathname}${location.search}` },
          })}
          className="h-10 w-10 rounded-full! p-0 sm:h-10 sm:w-auto sm:rounded-md sm:px-4 sm:py-2"
          aria-label="Nuevo plan"
          title="Nuevo plan"
        >
          <Plus className="h-5 w-5 sm:h-4 sm:w-4 shrink-0 sm:mr-1.5" />
          <span className="hidden sm:inline">Nuevo</span>
        </Button>
      ) : undefined}
      isLoading={isLoading && !showEmpty}
      isError={isError && !data && !showEmpty}
      onRetry={() => void refetch()}
      isRetrying={isFetching}
      isEmpty={showEmpty || isEmpty}
      emptyStateContent={showEmpty ? (
        <OrganizationSelectionEmptyState description="Elige una organización para consultar sus planes." />
      ) : undefined}
      emptyIcon={<Package className="h-16 w-16 text-subtle-foreground" />}
      emptyTitle={hasActiveFilters ? 'Sin resultados' : 'Sin planes'}
      emptyDescription={
        hasActiveFilters
          ? 'Ningún plan coincide con tu búsqueda o filtros.'
          : 'Crea tu primer plan para empezar a registrar suscripciones.'
      }
      emptyAction={
        hasActiveFilters ? (
          <Button variant="outline" onClick={clearFilters}>
            <RotateCcw className="h-4 w-4 mr-2 shrink-0" />
            Limpiar filtros
          </Button>
        ) : !showEmpty && isEmpty ? (
          <Button onClick={() => navigate('/subscriptions/plans/new', {
            state: { returnTo: `${location.pathname}${location.search}` },
          })}>
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            Crear plan
          </Button>
        ) : undefined
      }
    >
      {!showEmpty && data?.plans.map((plan) => (
        <ListCard
          key={plan.id}
          className="md:flex-row md:items-center md:justify-between"
        >
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium text-foreground">{plan.name}</p>
              <Badge variant={plan.active ? 'default' : 'secondary'}>
                {plan.active ? 'Activo' : 'Inactivo'}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                {formatCurrency(plan.price)}/mes
              </span>
              {plan.description && <span className="truncate">{plan.description}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleToggleActive(plan.id, plan.active)}
              disabled={updateMutation.isPending}
              aria-busy={updateMutation.isPending}
              className="flex-1 md:flex-none"
            >
              {plan.active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link
                to={`/subscriptions/plans/${plan.id}/edit`}
                state={{ returnTo: `${location.pathname}${location.search}` }}
                aria-label={`Editar plan ${plan.name}`}
              >
                <Edit className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteTarget({ id: plan.id, name: plan.name })}
              aria-label={`Eliminar plan ${plan.name}`}
            >
              <Trash2 className="h-4 w-4 text-destructive shrink-0" />
            </Button>
          </div>
        </ListCard>
      ))}

      {!showEmpty && deleteTarget && (
        <DeletePlanSheet
          planId={deleteTarget.id}
          planName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}
    </ListPageLayout>
  )
}
