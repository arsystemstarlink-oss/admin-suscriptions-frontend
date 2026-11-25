import { useState } from 'react'
import { useAdmins, useDeleteAdmin } from '@/hooks/useAdmins'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ConfirmDialog, ErrorState } from '@/components/design-system'
import { CreateAdminSheet } from '@/components/admin/CreateAdminSheet'
import { EditAdminSheet } from '@/components/admin/EditAdminSheet'
import { formatDate } from '@/lib/constants'
import type { Admin } from '@/types/api'
import { ChevronDown, Edit, Plus, Trash2, Users } from 'lucide-react'

interface OrganizationAdminsSectionProps {
  organizationId: string
  organizationName: string
  organizationActive: boolean
  adminLimit: number
}

export function OrganizationAdminsSection({
  organizationId,
  organizationName,
  organizationActive,
  adminLimit,
}: OrganizationAdminsSectionProps) {
  const [expanded, setExpanded] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [deletingAdmin, setDeletingAdmin] = useState<Admin | null>(null)
  const { data, isLoading, isError, isFetching, refetch } = useAdmins(
    { organizationId, limit: 100 },
    { enabled: expanded },
  )
  const deleteMutation = useDeleteAdmin()
  const admins = (data?.admins || []).filter((admin) => admin.role !== 'super-admin')
  const limitReached = admins.length >= adminLimit
  const addBlockedReason = !organizationActive
    ? 'La organización está inactiva. Actívala para agregar administradores.'
    : limitReached
      ? `El plan permite ${adminLimit} ${adminLimit === 1 ? 'administrador' : 'administradores'}. Cambia de plan para agregar más.`
      : null
  const addDisabled = isLoading || isError || addBlockedReason !== null

  return (
    <section className="mt-4 border-t border-border-subtle pt-4" aria-label={`Administradores de ${organizationName}`}>
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={`organization-admins-${organizationId}`}
        onClick={() => setExpanded((current) => !current)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg text-left text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Administradores</span>
          {data && (
            <Badge variant="outline" className="text-xs" title={`Límite del plan: ${adminLimit}`}>
              {admins.length} de {adminLimit}
            </Badge>
          )}
          {!expanded && !data && (
            <span className="truncate text-xs text-muted-foreground">Ver y gestionar accesos</span>
          )}
        </span>
        <ChevronDown
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      </button>

      <div id={`organization-admins-${organizationId}`} hidden={!expanded}>
        {expanded && (
          <div className="pt-3">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            {addBlockedReason ? (
              <p className="text-xs text-muted-foreground">{addBlockedReason}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Administra quién puede acceder a esta organización.
              </p>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateOpen(true)}
              disabled={addDisabled}
              title={
                isLoading
                  ? 'Cargando administradores...'
                  : isError
                    ? 'No se pudo actualizar la lista de administradores'
                    : addBlockedReason ?? 'Agregar administrador'
              }
            >
              <Plus className="mr-1.5 h-4 w-4 shrink-0" />
              Agregar administrador
            </Button>
          </div>

          {isError && data && (
            <div
              role="alert"
              className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-warning/20 bg-warning/10 p-3 text-xs text-warning"
            >
              <span>No se pudo actualizar la lista de administradores.</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void refetch()}
                disabled={isFetching}
              >
                {isFetching ? 'Reintentando...' : 'Reintentar'}
              </Button>
            </div>
          )}

          {isError && !data ? (
            <ErrorState
              title="No se pudieron cargar los administradores"
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : isLoading ? (
            <p role="status" className="text-sm text-muted-foreground">Cargando administradores...</p>
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
                    <p className="truncate text-sm font-medium text-foreground">{admin.name}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>{admin.email}</span>
                      {admin.phone && <span>{admin.phone}</span>}
                      {admin.lastLoginAt && (
                        <span>Último acceso: {formatDate(admin.lastLoginAt)}</span>
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
                </li>
              ))}
            </ul>
          )}
          </div>
        )}
      </div>

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
      <ConfirmDialog
        open={!!deletingAdmin}
        onOpenChange={(open) => !open && setDeletingAdmin(null)}
        title="Eliminar administrador"
        description={
          deletingAdmin
            ? `Se eliminará a ${deletingAdmin.name} y perderá el acceso a ${organizationName}. Esta acción no se puede deshacer.`
            : ''
        }
        confirmLabel="Eliminar administrador"
        pendingLabel="Eliminando..."
        isPending={deleteMutation.isPending}
        destructive
        onConfirm={() => {
          if (!deletingAdmin) return
          deleteMutation.mutate(deletingAdmin.id, {
            onSuccess: () => setDeletingAdmin(null),
            onError: () => setDeletingAdmin(null),
          })
        }}
      />
    </section>
  )
}
