import { useNavigate } from 'react-router-dom'
import { MessageSquare, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

interface HeaderActionsProps {
  unreadChatsCount: number
  onOpenSearch: () => void
}

export function HeaderActions({ unreadChatsCount, onOpenSearch }: HeaderActionsProps) {
  const navigate = useNavigate()

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="relative h-10 w-10 rounded-full bg-primary-700 border-primary-600 text-primary-50 hover:bg-primary-600 hover:text-primary-50 dark:bg-primary-900 dark:border-primary-800 dark:hover:bg-primary-800 sm:h-9 sm:w-9"
        onClick={() => navigate('/chats')}
        aria-label="Abrir chats"
      >
        <MessageSquare className="h-4 w-4 shrink-0" />
        {unreadChatsCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-500 px-1 text-[10px] font-semibold text-white">
            {unreadChatsCount}
          </span>
        )}
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-full bg-primary-700 border-primary-600 text-primary-50 hover:bg-primary-600 hover:text-primary-50 dark:bg-primary-900 dark:border-primary-800 dark:hover:bg-primary-800 sm:h-9 sm:w-auto sm:rounded-md sm:px-3 sm:gap-2 sm:justify-start sm:min-w-48"
        onClick={onOpenSearch}
        aria-label="Buscar"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="hidden sm:inline">Buscar... (Ctrl+K)</span>
      </Button>
      <ThemeToggle />
    </div>
  )
}
