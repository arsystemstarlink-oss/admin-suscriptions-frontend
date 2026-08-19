import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAdmins, useDeleteAdmin } from '@/hooks/useAdmins'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Users, Edit, Trash2, ShieldCheck, Building2 } from 'lucide-react'
import { ListPageLayout, ListCard } from '@/components/design-system'
import { FilterPill } from '@/components/design-system/FilterPill'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CreateAdminForm } from '@/components/admin/CreateAdminForm'
import { EditAdminModal } from '@/components/admin/EditAdminModal'
import type { Admin } from '@/types/api'

const ALL_ORGS_VALUE = '__all__'

export function AdminsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const isSuperAdmin = useIsSuperAdmin()

  const organizationIdFilter = searchParams.get('organizationId') || undefined

  const { data, isLoading } = useAdmins({
    search: searchParams.get('search') || undefined,
    organizationId: organizationIdFilter,
    limit: 50,
    offset: 0,
  })

  const { data: organizationsData } = useOrganizations(
    { limit: 100 },
    { enabled: isSuperAdmin },
  )
  const organizations = organizationsData?.organizations || []
  const organizationNameById = new Map(organizations.map((o) => [o.id, o.name]))

  const deleteMutation = useDeleteAdmin()

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

  const handleOrganizationFilter = (value: string) => {
    const params = new URLSearchParams(searchParams)
    if (value === ALL_ORGS_VALUE) {
      params.delete('organizationId')
    } else {
      params.set('organizationId', value)
    }
    setSearchParams(params)
  }

  const admins = data?.admins || []
  const isEmpty = !isLoading && admins.length === 0

  return (
    <ListPageLayout
      searchProps={{
        value: search,
        onChange: handleSearch,
        placeholder: "Buscar por nombre, email o teléfono...",
      }}
      filters={
        <>
          {isSuperAdmin && (
            <Select
              value={organizationIdFilter || ALL_ORGS_VALUE}
              onValueChange={handleOrganizationFilter}
            >
              <SelectTrigger className="w-56 h-9 shrink-0" aria-label="Filtrar por organización">
                <SelectValue placeholder="Todas las organizaciones" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ORGS_VALUE}>Todas las organizaciones</SelectItem>
                {organizations.map((org) => (
                  <SelectItem key={org.id} value={org.id}>
                    {org.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <FilterPill active={showCreateForm} onClick={() => setShowCreateForm(!showCreateForm)}>
            <Plus className="h-3.5 w-3.5 mr-1.5 shrink-0" />
            Nuevo Administrador
          </FilterPill>
        </>
      }
      isLoading={isLoading}
      isEmpty={isEmpty}
      emptyIcon={<Users className="h-16 w-16 text-primary-200 dark:text-primary-800" />}
      emptyTitle="Sin administradores"
      emptyDescription="No encontramos resultados. Modifica los filtros o crea uno nuevo."
      emptyAction={
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2 shrink-0" />
          Crear Administrador
        </Button>
      }
    >
      {showCreateForm && (
        <div className="bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Crear nuevo administrador</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCreateForm(false)}
            >
              Cancelar
            </Button>
          </div>
          <CreateAdminForm
            mode="register"
            onSuccess={() => setShowCreateForm(false)}
          />
        </div>
      )}

      <div className="space-y-3">
        {admins.map((admin) => (
          <ListCard
            key={admin.id}
            className="md:flex-row md:items-center md:justify-between"
          >
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-medium text-foreground">{admin.name}</p>
                {admin.role === 'super-admin' ? (
                  <Badge variant="secondary" className="text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1 shrink-0" />
                    Super Admin
                  </Badge>
                ) : (
                  <Badge variant="default" className="text-xs">
                    <ShieldCheck className="h-3 w-3 mr-1 shrink-0" />
                    Admin
                  </Badge>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-primary-500 dark:text-primary-400">
                <span className="font-medium">{admin.email}</span>
                {admin.phone && (
                  <span className="truncate">{admin.phone}</span>
                )}
                {isSuperAdmin && (
                  <span className="inline-flex items-center gap-1 text-xs">
                    <Building2 className="h-3 w-3 shrink-0" />
                    {admin.organizationId
                      ? organizationNameById.get(admin.organizationId) || 'Organización desconocida'
                      : 'Sin organización'}
                  </span>
                )}
                {admin.lastLoginAt && (
                  <span className="text-xs">
                    Último acceso: {new Date(admin.lastLoginAt).toLocaleDateString('es-ES')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {(isSuperAdmin || admin.role !== 'super-admin') && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setEditingAdmin(admin)}
                  >
                    <Edit className="h-4 w-4 shrink-0" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => {
                      if (confirm(`¿Eliminar a ${admin.name}? Esta acción no se puede deshacer.`)) {
                        deleteMutation.mutate(admin.id)
                      }
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
                  </Button>
                </>
              )}
            </div>
          </ListCard>
        ))}
      </div>

      <EditAdminModal
        admin={editingAdmin!}
        open={!!editingAdmin}
        onOpenChange={(open) => !open && setEditingAdmin(null)}
      />
    </ListPageLayout>
  )
}
