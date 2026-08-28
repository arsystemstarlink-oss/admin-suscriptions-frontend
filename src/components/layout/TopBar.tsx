import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { useUnreadChatsCount } from '@/hooks/useUnreadChatsCount'
import { HeaderActions } from '@/components/layout/HeaderActions'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Building2 } from 'lucide-react'
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
  const unreadChatsCount = useUnreadChatsCount()

  return (
    <header className="h-16 border-b border-primary-700 flex items-center justify-between px-4 md:px-6 bg-primary-800 text-primary-50 dark:bg-primary-950 dark:text-primary-50 dark:border-primary-900">
      <div className="flex items-center gap-3">
        {isMobile && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onMobileToggle}
            className="md:hidden text-primary-50 hover:bg-primary-700 hover:text-primary-50 dark:hover:bg-primary-900"
            aria-label="Abrir menú"
          >
            <Menu className="h-5 w-5 shrink-0" />
          </Button>
        )}

        <BrandMark size="md" className="text-primary-50" />

        {isSuperAdmin && organizations && organizations.length > 0 && (
          <Select
            value={selectedOrganizationId || ALL_ORGS_VALUE}
            onValueChange={(value) => onOrganizationChange?.(value === ALL_ORGS_VALUE ? null : value)}
          >
            <SelectTrigger className="w-auto h-8 sm:w-48 border-primary-600 bg-primary-700 text-primary-50 hover:bg-primary-600 hover:text-primary-50 dark:bg-primary-900 dark:border-primary-700 dark:hover:bg-primary-800">
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

      <HeaderActions unreadChatsCount={unreadChatsCount} onOpenSearch={onOpenSearch ?? openOmniSearch} />
    </header>
  )
}
