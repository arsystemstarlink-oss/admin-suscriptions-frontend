import { useState } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { usePlans, useUpdatePlan } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Package, Edit, Trash2, Plus } from 'lucide-react'
import { formatCurrency } from '@/lib/constants'
import { toast } from 'sonner'
import { DeletePlanModal } from '@/components/modals/DeletePlanModal'
import { ListPageLayout, ListCard } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'

export function PlansListPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null)

  const activeFilter = searchParams.get('active')
  const { data, isLoading } = usePlans({
    search: searchParams.get('search') || undefined,
    active: activeFilter === 'true' ? true : activeFilter === 'false' ? false : undefined,
  })

  const updateMutation = useUpdatePlan()

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

  const handleFilter = (value: string | null) => {
    const params = new URLSearchParams(searchParams)
    if (value) {
      params.set('active', value)
    } else {
      params.delete('active')
    }
    setSearchParams(params)
  }

  const navigate = useNavigate()

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, data: { active: !currentActive } })
      toast.success(currentActive ? 'Plan desactivado' : 'Plan activado')
    } catch {
      toast.error('Error al cambiar el estado del plan')
    }
  }

  const isEmpty = !data || data.plans.length === 0

  return (
    <ListPageLayout
      searchProps={{
        value: search,
        onChange: handleSearch,
        placeholder: "Buscar por nombre o descripción...",
      }}
      filters={
        <>
          <FilterPill active={false} onClick={() => navigate('/subscriptions/plans/new')}>
            <Plus className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            Nuevo Plan
          </FilterPill>
          <FilterPill active={activeFilter === 'true'} onClick={() => handleFilter(activeFilter === 'true' ? null : 'true')}>
            Activos
          </FilterPill>
          <FilterPill active={activeFilter === 'false'} onClick={() => handleFilter(activeFilter === 'false' ? null : 'false')}>
            Inactivos
          </FilterPill>
        </>
      }
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyIcon={<Package className="h-16 w-16 text-primary-200 dark:text-primary-800" />}
      emptyTitle="No se encontraron planes"
      emptyDescription="Modifica los filtros o crea un nuevo plan."
    >
      {data?.plans.map((plan) => (
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
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-primary-500 dark:text-primary-400">
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
              className="flex-1 md:flex-none"
            >
              {plan.active ? 'Desactivar' : 'Activar'}
            </Button>
            <Button variant="outline" size="icon" asChild>
              <Link to={`/subscriptions/plans/${plan.id}/edit`}>
                <Edit className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setDeleteTarget({ id: plan.id, name: plan.name })}
            >
              <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
            </Button>
          </div>
        </ListCard>
      ))}

      {deleteTarget && (
        <DeletePlanModal
          planId={deleteTarget.id}
          planName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}
    </ListPageLayout>
  )
}
