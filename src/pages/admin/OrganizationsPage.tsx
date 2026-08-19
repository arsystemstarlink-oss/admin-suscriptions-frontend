import { useState } from 'react'
import { useSearchParams, Navigate } from 'react-router-dom'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { useOrganizations, useDeleteOrganization } from '@/hooks/useOrganizations'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Building2, Edit, Trash2, MessageCircle, MessageCircleOff } from 'lucide-react'
import { ListPageLayout, ListCard } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'
import { CreateOrganizationForm } from '@/components/organizations/CreateOrganizationForm'
import { EditOrganizationModal } from '@/components/organizations/EditOrganizationModal'
import type { Organization } from '@/types/api'

export function OrganizationsPage() {
  const isSuperAdmin = useIsSuperAdmin()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [editingOrganization, setEditingOrganization] = useState<Organization | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const { data, isLoading } = useOrganizations(
    {
      search: searchParams.get('search') || undefined,
      limit: 50,
      offset: 0,
    },
    { enabled: isSuperAdmin },
  )

  const deleteMutation = useDeleteOrganization()

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

  const organizations = data?.organizations || []
  const isEmpty = !isLoading && organizations.length === 0

  return (
    <ListPageLayout
      searchProps={{
        value: search,
        onChange: handleSearch,
        placeholder: 'Buscar por nombre o slug...',
      }}
      filters={
        <FilterPill active={showCreateForm} onClick={() => setShowCreateForm(!showCreateForm)}>
          <Plus className="h-3.5 w-3.5 mr-1.5 shrink-0" />
          Nueva Organización
        </FilterPill>
      }
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyIcon={<Building2 className="h-16 w-16 text-primary-200 dark:text-primary-800" />}
      emptyTitle="Sin organizaciones"
      emptyDescription="No encontramos resultados. Modifica los filtros o crea una nueva."
      emptyAction={
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2 shrink-0" />
          Crear Organización
        </Button>
      }
    >
      {showCreateForm && (
        <div className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Crear nueva organización</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateForm(false)}
            >
              Cancelar
            </Button>
          </div>
          <CreateOrganizationForm onSuccess={() => setShowCreateForm(false)} />
        </div>
      )}

      <div className="space-y-3">
        {organizations.map((organization) => (
          <ListCard
            key={organization.id}
            className="md:flex-row md:items-center md:justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{organization.name}</p>
                {organization.active ? (
                  <Badge
                    variant="outline"
                    className="text-xs text-emerald-700 bg-emerald-50 border-emerald-200 dark:text-emerald-400 dark:bg-emerald-950/50 dark:border-emerald-800"
                  >
                    Activa
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950/50 dark:border-red-800"
                  >
                    Inactiva
                  </Badge>
                )}
                {organization.twilioConfigured ? (
                  <Badge
                    variant="outline"
                    className="text-xs text-blue-700 bg-blue-50 border-blue-200 dark:text-blue-400 dark:bg-blue-950/50 dark:border-blue-800"
                  >
                    <MessageCircle className="h-3 w-3 mr-1 shrink-0" />
                    WhatsApp
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-xs text-amber-700 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-950/50 dark:border-amber-800"
                  >
                    <MessageCircleOff className="h-3 w-3 mr-1 shrink-0" />
                    Sin WhatsApp
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-primary-500 dark:text-primary-400">
                {organization.slug && <span className="font-medium">{organization.slug}</span>}
                <span className="text-xs">
                  Creada: {new Date(organization.createdAt).toLocaleDateString('es-ES')}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setEditingOrganization(organization)}
              >
                <Edit className="h-4 w-4 shrink-0" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  if (
                    confirm(
                      `¿Eliminar la organización ${organization.name}? Solo es posible si no tiene usuarios asignados.`,
                    )
                  ) {
                    deleteMutation.mutate(organization.id)
                  }
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
              </Button>
            </div>
          </ListCard>
        ))}
      </div>

      <EditOrganizationModal
        organization={editingOrganization!}
        open={!!editingOrganization}
        onOpenChange={(open) => !open && setEditingOrganization(null)}
      />
    </ListPageLayout>
  )
}
