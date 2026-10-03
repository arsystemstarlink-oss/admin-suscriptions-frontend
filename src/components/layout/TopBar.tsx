import { useUIStore } from '@/stores/ui.store'
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
  onOpenSearch?: () => void
  isSuperAdmin?: boolean
  organizations?: Organization[]
  selectedOrganizationId?: string | null
  onOrganizationChange?: (organizationId: string | null) => void
}

const ALL_ORGS_VALUE = '__all__'

export function TopBar({
  isMobile,
  onMobileToggle,
  onOpenSearch,
  isSuperAdmin,
  organizations,
  selectedOrganizationId,
  onOrganizationChange,
}: TopBarProps) {
  const { openOmniSearch } = useUIStore()

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

        {isSuperAdmin && organizations && organizations.length > 0 && (
          <Select
            value={selectedOrganizationId || ALL_ORGS_VALUE}
            onValueChange={(value) => onOrganizationChange?.(value === ALL_ORGS_VALUE ? null : value)}
          >
            <SelectTrigger className="w-auto h-8 sm:w-48 border-border bg-surface-elevated text-surface-elevated-foreground hover:bg-surface-hover hover:text-surface-elevated-foreground">
              <Building2 className="h-3.5 w-3.5 shrink-0" />
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
      </div>

      <div className="flex items-center gap-2">
        <ExchangeRateBadge className="shrink-0" />
        <HeaderActions onOpenSearch={onOpenSearch ?? openOmniSearch} />
      </div>
    </header>
  )
}
