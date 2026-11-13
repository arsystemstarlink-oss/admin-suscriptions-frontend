import { ThemeToggle } from '@/components/theme/ThemeToggle'
import { RefreshButton } from '@/components/layout/RefreshButton'
import { GlobalSearch } from '@/components/search/GlobalSearch'

export function HeaderActions() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <GlobalSearch />
      <RefreshButton className="h-11 w-11 sm:h-10 sm:w-10" />
      <ThemeToggle className="h-11 w-11 sm:h-10 sm:w-10" />
    </div>
  )
}
