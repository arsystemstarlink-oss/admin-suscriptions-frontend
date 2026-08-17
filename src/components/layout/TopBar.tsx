import { useUIStore } from '@/stores/ui.store'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'
import { BrandMark } from '@/components/brand/BrandMark'
import { useUnreadChatsCount } from '@/hooks/useUnreadChatsCount'
import { HeaderActions } from '@/components/layout/HeaderActions'

interface TopBarProps {
  isMobile: boolean
  onMobileToggle: () => void
  onOpenSearch?: () => void
}

export function TopBar({ isMobile, onMobileToggle, onOpenSearch }: TopBarProps) {
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

        <BrandMark size="md" hideSystemOnMobile className="text-primary-50" />
      </div>

      <HeaderActions unreadChatsCount={unreadChatsCount} onOpenSearch={onOpenSearch ?? openOmniSearch} />
    </header>
  )
}
