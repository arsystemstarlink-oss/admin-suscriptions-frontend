import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function RefreshButton({ className }: { className?: string }) {
  const queryClient = useQueryClient()
  const isFetching = useIsFetching() > 0

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => queryClient.invalidateQueries()}
      disabled={isFetching}
      className={cn(
        'h-10 w-10 shrink-0 text-header-foreground hover:bg-header-hover hover:text-header-foreground sm:h-8 sm:w-8',
        className,
      )}
      aria-label="Actualizar datos"
      title="Actualizar datos"
    >
      <RefreshCw className={cn('h-4 w-4 shrink-0', isFetching && 'animate-spin')} />
    </Button>
  )
}
