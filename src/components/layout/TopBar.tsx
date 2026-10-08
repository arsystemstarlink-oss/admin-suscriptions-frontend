import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { HeaderActions } from '@/components/layout/HeaderActions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'
import { ExchangeRateBadge } from '@/components/exchange/ExchangeRateBadge'
import type { Organization } from '@/types/api'

interface TopBarProps {
  isMobile: boolean
  onMobileToggle: () => void
  isSuperAdmin?: boolean
  organizations?: Organization[]
  organizationsLoading?: boolean
  organizationsError?: boolean
  onRetryOrganizations?: () => void
  selectedOrganizationId?: string | null
  onOrganizationChange?: (organizationId: string | null) => void
}

const ALL_ORGS_VALUE = '__all__'

export function TopBar({
  isMobile,
  onMobileToggle,
  isSuperAdmin,
  organizations,
  organizationsLoading,
  organizationsError,
  onRetryOrganizations,
  selectedOrganizationId,
  onOrganizationChange,
}: TopBarProps) {
  const hasOrganizations = !!organizations && organizations.length > 0
  const effectiveValue =
    selectedOrganizationId && organizations?.some((org) => org.id === selectedOrganizationId)
      ? selectedOrganizationId
      : ALL_ORGS_VALUE

  return (
    <header className="h-16 border-b border-border-subtle flex items-center justify-between px-4 md:px-6 bg-header text-header-foreground">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileToggle}
            className="md:hidden text-header-foreground hover:bg-header-hover hover:text-header-foreground"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5 shrink-0" />
          </Button>
        )}

        <BrandMark size="md" variant="light" />

      </div>

      <div className="flex items-center gap-2">
        <ExchangeRateBadge className="shrink-0" />
        {isSuperAdmin && (
          <Select
            value={effectiveValue}
            onValueChange={(value) => onOrganizationChange?.(value === ALL_ORGS_VALUE ? null : value)}
          >
            <SelectTrigger
              className="w-auto h-8 sm:w-48 border-border bg-surface-elevated text-surface-elevated-foreground hover:bg-surface-hover hover:text-surface-elevated-foreground"
              title={
                organizationsLoading
                  ? 'Cargando organizaciones…'
                  : organizationsError
                    ? 'No se pudieron cargar las organizaciones'
                    : !hasOrganizations
                      ? 'No hay organizaciones disponibles'
                      : undefined
              }
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <SelectValue placeholder={organizationsLoading ? 'Cargando…' : 'Organización'} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_ORGS_VALUE}>Seleccionar organización…</SelectItem>
              {organizations?.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  {org.name}
                </SelectItem>
              ))}
              {!organizationsLoading && !hasOrganizations && (
                <div className="px-2 py-3 text-center">
                  <p className="text-sm text-muted-foreground">
                    {organizationsError ? 'No se pudieron cargar las organizaciones.' : 'No hay organizaciones disponibles.'}
                  </p>
                  {organizationsError && onRetryOrganizations && (
                    <button
                      type="button"
                      onClick={onRetryOrganizations}
                      className="mt-1 text-sm font-medium text-primary hover:underline"
                    >
                      Reintentar
                    </button>
                  )}
                </div>
              )}
            </SelectContent>
          </Select>
        )}
        <HeaderActions />
      </div>
    </header>
  )
}
