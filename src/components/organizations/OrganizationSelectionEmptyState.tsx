import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { EmptyState } from '@/components/design-system/EmptyState'
import { useOrganizations } from '@/hooks/useOrganizations'
import { useOrganizationStore } from '@/stores/organization.store'

const NO_ORGANIZATION_VALUE = '__none__'

interface OrganizationSelectionEmptyStateProps {
  description: string
}

export function OrganizationSelectionEmptyState({ description }: OrganizationSelectionEmptyStateProps) {
  const { selectedOrganizationId, setOrganization } = useOrganizationStore()
  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useOrganizations({ limit: 100 })
  const organizations = data?.organizations.filter((organization) => organization.active !== false) ?? []
  const value = selectedOrganizationId && organizations.some((organization) => organization.id === selectedOrganizationId)
    ? selectedOrganizationId
    : NO_ORGANIZATION_VALUE

  return (
    <EmptyState
      icon={<Building2 className="h-12 w-12 text-muted-foreground" />}
      title="Selecciona una organización"
      description={description}
      action={
        <div className="flex flex-col items-center gap-2">
          <Select
            value={value}
            onValueChange={(organizationId) =>
              setOrganization(organizationId === NO_ORGANIZATION_VALUE ? null : organizationId)
            }
            disabled={isLoading || organizations.length === 0}
          >
            <SelectTrigger
              aria-label="Seleccionar organización para continuar"
              className="w-64 bg-surface-muted border-input text-foreground"
            >
              <SelectValue placeholder={isLoading ? 'Cargando organizaciones…' : 'Organización'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_ORGANIZATION_VALUE}>Ninguna organización</SelectItem>
              {organizations.map((organization) => (
                <SelectItem key={organization.id} value={organization.id}>
                  {organization.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {isError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <span>No se pudieron cargar las organizaciones.</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          )}
          {!isLoading && !isError && organizations.length === 0 && (
            <p className="text-sm text-muted-foreground">No hay organizaciones disponibles.</p>
          )}
        </div>
      }
    />
  )
}
