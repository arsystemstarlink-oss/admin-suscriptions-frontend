import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router-dom'
import { useAdmins, useDeleteAdmin } from '@/hooks/useAdmins'
import { useIsSuperAdmin } from '@/stores/auth.store'
import { Button } from '@/components/ui/button'
import { formatLocalDate } from '@/lib/constants'
import { Plus, Users, Edit, Trash2 } from 'lucide-react'
import { ListPageLayout, ListCard } from '@/components/design-system'
import { ConfirmDialog } from '@/components/design-system/ConfirmDialog'
import { CreateAdminSheet } from '@/components/admin/CreateAdminSheet'
import { EditAdminSheet } from '@/components/admin/EditAdminSheet'
import type { Admin } from '@/types/api'

export function AdminsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null)
  const isSuperAdmin = useIsSuperAdmin()

  const { data, isLoading } = useAdmins({
    search: searchParams.get('search') || undefined,
    limit: 50,
    offset: 0,
  })

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

  const admins = (data?.admins || []).filter((admin) => admin.role !== 'super-admin')
  const isEmpty = !isLoading && admins.length === 0

  if (isSuperAdmin) return <Navigate to="/config/organization" replace />

  return (
    <>
      <ListPageLayout
        searchProps={{
          value: search,
          onChange: handleSearch,
          placeholder: 'Buscar por nombre, correo o teléfono...',
        }}
        primaryAction={
          <Button
            onClick={() => setCreateOpen(true)}
            size="icon"
            className="rounded-full sm:w-auto sm:rounded-md sm:px-4"
            aria-label="Nuevo administrador"
            title="Nuevo administrador"
          >
            <Plus className="h-5 w-5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Nuevo administrador</span>
          </Button>
        }
        isLoading={isLoading}
        isEmpty={isEmpty}
        emptyIcon={<Users className="h-16 w-16 text-subtle-foreground" />}
        emptyTitle="Sin administradores"
        emptyDescription="No encontramos resultados. Modifica los filtros o crea uno nuevo."
        emptyAction={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2 shrink-0" />
            Crear administrador
          </Button>
        }
      >
        <div className="space-y-3">
          {admins.map((admin) => (
            <ListCard
              key={admin.id}
              className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground">{admin.name}</p>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                  <span className="font-medium">{admin.email}</span>
                  {admin.phone && (
                    <span className="truncate">{admin.phone}</span>
                  )}
                  {admin.lastLoginAt && (
                    <span className="text-xs">
                      Último acceso: {formatLocalDate(admin.lastLoginAt)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAdmin(admin)}
                >
                  <Edit className="h-4 w-4 shrink-0" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setDeletingAdmin(admin)}
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Eliminar
                </Button>
              </div>
            </ListCard>
          ))}
        </div>
      </ListPageLayout>

      <CreateAdminSheet open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!deletingAdmin}
        onOpenChange={(open) => !open && setDeletingAdmin(null)}
        title="Eliminar administrador"
        description={`¿Eliminar a ${deletingAdmin?.name ?? ''}? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        pendingLabel="Eliminando..."
        isPending={deleteMutation.isPending}
        destructive
        onConfirm={() => {
          if (!deletingAdmin) return
          deleteMutation.mutate(deletingAdmin.id, { onSettled: () => setDeletingAdmin(null) })
        }}
      />

      <EditAdminSheet
        admin={editingAdmin!}
        open={!!editingAdmin}
        onOpenChange={(open) => !open && setEditingAdmin(null)}
      />
    </>
  )
}
