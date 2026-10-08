
import { ThemeToggle } from '@/components/theme/ThemeToggle'

export function HeaderActions() {
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <ThemeToggle className="h-9 w-9 sm:h-8 sm:w-8" />
    </div>
  )
}
