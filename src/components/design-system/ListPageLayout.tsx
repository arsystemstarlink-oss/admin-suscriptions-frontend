import { type ReactNode } from 'react'
import { PageHeader } from '@/components/design-system/PageHeader'
import { PageToolbar } from '@/components/design-system/PageToolbar'
import { EmptyState } from '@/components/design-system/EmptyState'
import { ErrorState } from '@/components/design-system/ErrorState'
import { ListSkeleton } from '@/components/design-system/Skeleton'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListPageLayoutProps {
  title?: string
  description?: string
  searchProps: {
    value: string
    onChange: (value: string) => void
    placeholder: string
  }
  filters?: ReactNode
  primaryAction?: ReactNode
  fabHref?: string
  isLoading?: boolean
  isError?: boolean
  onRetry?: () => void
  isRetrying?: boolean
  isEmpty?: boolean
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
  emptyStateContent?: ReactNode
  children: ReactNode
  className?: string
}

export function ListPageLayout({
  title,
  description,
  searchProps,
  filters,
  primaryAction,
  fabHref,
  isLoading,
  isError,
  onRetry,
  isRetrying,
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyStateContent,
  children,
  className,
}: ListPageLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {(title || description) && title && (
        <PageHeader
          title={title}
          description={description}
        />
      )}

      <PageToolbar
        searchProps={searchProps}
        primaryAction={primaryAction}
        filters={filters}
      />

      {isLoading ? (
        <ListSkeleton className="px-2" />
      ) : isError ? (
        <ErrorState onRetry={onRetry} isRetrying={isRetrying} />
      ) : isEmpty ? (
        emptyStateContent ?? (
          <EmptyState
            icon={emptyIcon}
            title={emptyTitle || 'Sin resultados'}
            description={emptyDescription}
            action={emptyAction}
          />
        )
      ) : (
        <div className="space-y-3">
          {children}
        </div>
      )}

      {fabHref && (
        <a
          href={fabHref}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+70px)] right-4 flex items-center justify-center h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-lg active:scale-95 transition-transform touch-manipulation z-40"
          aria-label={title ? `Nuevo ${title.slice(0, -1)}` : 'Nuevo'}
        >
          <Plus size={24} strokeWidth={2.5} />
        </a>
      )}
    </div>
  )
}
