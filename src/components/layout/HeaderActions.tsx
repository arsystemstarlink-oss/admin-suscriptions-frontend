import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { RefreshButton } from '@/components/layout/RefreshButton'
import { GlobalSearch } from '@/components/search/GlobalSearch'

export function HeaderActions() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <GlobalSearch />
      <RefreshButton className="h-9 w-9 sm:h-8 sm:w-8" />
      <ThemeToggle className="h-9 w-9 sm:h-8 sm:w-8" />
    </div>
  )
}
