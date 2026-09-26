import { type ReactNode } from 'react'
import { SearchInput } from '@/components/design-system/SearchInput'
import { cn } from '@/lib/utils'

interface PageToolbarProps {
  title?: string
  description?: string
  searchProps: {
    value: string
    onChange: (value: string) => void
    placeholder: string
  }
  filters?: ReactNode
  primaryAction?: ReactNode
  actions?: ReactNode
  className?: string
}

export function PageToolbar({ title, description, searchProps, filters, primaryAction, actions, className }: PageToolbarProps) {
  const hasHeading = Boolean(title || description || actions)
  return (
    <div className={cn('sticky top-0 z-20 flex flex-col bg-slate-50/90 dark:bg-primary-950/90 backdrop-blur-md mb-1 sm:mb-2 -mx-4 px-4 pt-2 sm:pt-0 pb-2 sm:pb-3', className)}>
      {hasHeading && (
        <div className="flex items-center justify-between gap-2 py-2 sm:py-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {title && (
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {title}
                </h1>
                {description && (
                  <p className="text-muted-foreground mt-1 text-sm md:text-base">
                    {description}
                  </p>
                )}
              </div>
            )}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <SearchInput
              value={searchProps.value}
              onChange={searchProps.onChange}
              placeholder={searchProps.placeholder}
            />
          </div>
          {primaryAction && <div className="flex shrink-0 items-center">{primaryAction}</div>}
        </div>
        {filters && (
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pt-2 pb-1 no-scrollbar touch-pan-x">
            {filters}
          </div>
        )}
      </div>
    </div>
  )
}
