import { useNavigate } from 'react-router-dom'
import { MessageSquare, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

interface HeaderActionsProps {
  unreadChatsCount: number
  onOpenSearch: () => void
  showChatsButton?: boolean
  showSearchButton?: boolean
}

export function HeaderActions({ unreadChatsCount, onOpenSearch, showChatsButton = true, showSearchButton = true }: HeaderActionsProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {showChatsButton && (
        <Button
          variant="outline"
          size="icon"
          className="relative h-10 w-10 rounded-full bg-surface-elevated text-surface-elevated-foreground border-border hover:bg-surface-hover hover:text-surface-elevated-foreground sm:h-9 sm:w-9"
          onClick={() => navigate('/chats')}
          aria-label="Abrir chats"
        >
          <MessageSquare className="h-4 w-4 shrink-0" />
          {unreadChatsCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-success px-1 text-[10px] font-semibold text-success-foreground">
              {unreadChatsCount > 99 ? '99+' : unreadChatsCount}
            </span>
          )}
        </Button>
      )}
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
