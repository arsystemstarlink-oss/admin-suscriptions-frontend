import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { usePlans, useUpdatePlan } from '@/hooks/usePlans'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Plus, Search, Package, Edit, Trash2 } from 'lucide-react'
import { formatCurrency } from '@/lib/constants'
import { toast } from 'sonner'
import { DeletePlanModal } from '@/components/modals/DeletePlanModal'

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

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id, data: { active: !currentActive } })
      toast.success(currentActive ? 'Plan desactivado' : 'Plan activado')
    } catch {
      toast.error('Error al cambiar el estado del plan')
    }
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex justify-end">
        <Button asChild className="w-full md:w-auto">
          <Link to="/config/plans/new">
            <Plus className="h-4 w-4 md:mr-2 shrink-0" />
            <span className="hidden md:inline">Nuevo Plan</span>
            <span className="md:hidden">Nuevo</span>
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="relative flex-1 w-full md:max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                placeholder="Buscar por nombre o descripción..."
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              <Button
                variant={activeFilter === 'true' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter(activeFilter === 'true' ? null : 'true')}
                className="whitespace-nowrap"
              >
                Activos
              </Button>
              <Button
                variant={activeFilter === 'false' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilter(activeFilter === 'false' ? null : 'false')}
                className="whitespace-nowrap"
              >
                Inactivos
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !data || data.plans.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 shrink-0" />
              <p className="text-muted-foreground">No se encontraron planes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {data.plans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex flex-col gap-3 p-4 bg-muted rounded-lg border border-border md:flex-row md:items-center md:justify-between"
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
                      className="flex-1 md:flex-none"
                    >
                      {plan.active ? 'Desactivar' : 'Activar'}
                    </Button>
                    <Button variant="outline" size="icon" asChild>
                      <Link to={`/config/plans/${plan.id}/edit`}>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {deleteTarget && (
        <DeletePlanModal
          planId={deleteTarget.id}
          planName={deleteTarget.name}
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
        />
      )}
    </div>
  )
}
