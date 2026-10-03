
import {  Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

interface HeaderActionsProps {
  onOpenSearch: () => void
  showChatsButton?: boolean
  showSearchButton?: boolean
}

export function HeaderActions({ onOpenSearch, showSearchButton = true }: HeaderActionsProps) {

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {showSearchButton && (
      <Button
        variant="outline"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-full bg-surface-elevated text-surface-elevated-foreground border-border hover:bg-surface-hover hover:text-surface-elevated-foreground sm:h-9 sm:w-auto sm:rounded-md sm:px-3 sm:gap-2 sm:justify-start sm:min-w-48"
        onClick={onOpenSearch}
        aria-label="Buscar"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Buscar... (Ctrl+K)</span>
      </Button>
      )}
      <ThemeToggle className="h-9 w-9 sm:h-8 sm:w-8" />
    </div>
  )
}
