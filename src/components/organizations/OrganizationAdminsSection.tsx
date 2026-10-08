import { useState } from 'react'
import { useAdmins, useDeleteAdmin } from '@/hooks/useAdmins'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CreateAdminSheet } from '@/components/admin/CreateAdminSheet'
import { EditAdminSheet } from '@/components/admin/EditAdminSheet'
import type { Admin } from '@/types/api'
import { Edit, Plus, ShieldCheck, Trash2, Users } from 'lucide-react'

interface OrganizationAdminsSectionProps {
  organizationId: string
  organizationName: string
}

export function OrganizationAdminsSection({
  organizationId,
  organizationName,
}: OrganizationAdminsSectionProps) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const { data, isLoading } = useAdmins({ organizationId, limit: 100 })
  const deleteMutation = useDeleteAdmin()
  const admins = (data?.admins || []).filter((admin) => admin.role !== 'super-admin')

  return (
    <section className="mt-4 border-t border-border-subtle pt-4" aria-label={`Administradores de ${organizationName}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Administradores</h3>
          {!isLoading && (
            <Badge variant="outline" className="text-xs">
              {admins.length}
            </Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="mr-1.5 h-4 w-4 shrink-0" />
          Agregar administrador
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Cargando administradores...</p>
      ) : admins.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Esta organización aún no tiene administradores.
        </p>
      ) : (
        <ul className="divide-y divide-border-subtle">
          {admins.map((admin) => (
            <li
              key={admin.id}
              className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
                  <Badge variant="default" className="text-xs">
                    <ShieldCheck className="mr-1 h-3 w-3 shrink-0" />
                    Admin
                  </Badge>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span>{admin.email}</span>
                  {admin.phone && <span>{admin.phone}</span>}
                  {admin.lastLoginAt && (
                    <span>
                      Último acceso: {new Date(admin.lastLoginAt).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setEditingAdmin(admin)}
                  aria-label={`Editar administrador ${admin.name}`}
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
                  aria-label={`Eliminar administrador ${admin.name}`}
                >
                  <Trash2 className="h-4 w-4 shrink-0 text-destructive" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <CreateAdminSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        organizationId={organizationId}
        organizationName={organizationName}
      />
      <EditAdminSheet
        admin={editingAdmin!}
        open={!!editingAdmin}
        onOpenChange={(open) => !open && setEditingAdmin(null)}
      />
    </section>
  )
}
