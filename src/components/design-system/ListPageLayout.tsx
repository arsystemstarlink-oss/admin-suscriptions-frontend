import { type ReactNode } from 'react'
import { PageHeader } from '@/components/design-system/PageHeader'
import { SearchInput } from '@/components/design-system/SearchInput'
import { EmptyState } from '@/components/design-system/EmptyState'
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
  isEmpty?: boolean
  emptyIcon?: ReactNode
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: ReactNode
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
  isEmpty,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  children,
  className,
}: ListPageLayoutProps) {
  return (
    <div className={cn('flex flex-col gap-4 pb-[calc(100px+env(safe-area-inset-bottom))]', className)}>
      {(title || description || primaryAction) && title && (
        <PageHeader
          title={title}
          description={description}
          actions={primaryAction}
        />
      )}

      <div className="sticky top-0 z-10 px-4 py-2 backdrop-blur-md">
        <SearchInput
          value={searchProps.value}
          onChange={searchProps.onChange}
          placeholder={searchProps.placeholder}
        />
        {filters && (
          <div className="flex items-center gap-2 overflow-x-auto py-3 no-scrollbar touch-pan-x">
            {filters}
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 px-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
          ))}
        </div>
      ) : isEmpty ? (
        <EmptyState
          icon={emptyIcon}
          title={emptyTitle || 'Sin resultados'}
          description={emptyDescription}
          action={emptyAction}
        />
      ) : (
        <div className="space-y-3">
          {children}
        </div>
      )}

      {fabHref && (
        <a
          href={fabHref}
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+70px)] right-4 flex items-center justify-center h-14 w-14 rounded-full bg-primary-800 text-white shadow-lg active:scale-95 transition-transform touch-manipulation z-40 dark:bg-primary-700"
          aria-label={title ? `Nuevo ${title.slice(0, -1)}` : 'Nuevo'}
        >
          <Plus size={24} strokeWidth={2.5} />
        </a>
      )}
    </div>
  )
}
