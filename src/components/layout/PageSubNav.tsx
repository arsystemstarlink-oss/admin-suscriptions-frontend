import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PageSubNavTab {
  to: string
  icon: LucideIcon
  label: string
  title?: string
  subtitle?: string
  end?: boolean
  badge?: number
}

interface PageSubNavProps {
  tabs: PageSubNavTab[]
  title?: string
  subtitle?: string
}

export function PageSubNav({ tabs, title, subtitle }: PageSubNavProps) {
  const location = useLocation()

  const activeTab = tabs.find((tab) =>
    tab.end ? location.pathname === tab.to : location.pathname.startsWith(tab.to)
  )

  const headerTitle = title ?? activeTab?.title
  const headerSubtitle = subtitle ?? activeTab?.subtitle

  return (
    <div className="space-y-3 sm:space-y-4 md:space-y-6">
      {(headerTitle || headerSubtitle) && (
        <div>
          {headerTitle && (
            <h1 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
              {headerTitle}
            </h1>
          )}
          {headerSubtitle && (
            <p className="text-muted-foreground mt-0.5 sm:mt-1 text-xs sm:text-sm md:text-base">{headerSubtitle}</p>
          )}
        </div>
      )}

      <nav
        className="flex w-full gap-1 overflow-x-auto rounded-xl bg-surface text-surface-foreground p-1 text-muted-foreground border border-border no-scrollbar touch-pan-x sm:gap-3 sm:p-2 sm:rounded-2xl"
        aria-label="Secciones"
      >
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.end}
            title={tab.label}
            aria-label={tab.label}
            className={({ isActive }) =>
              cn(
                'inline-flex min-w-[72px] flex-1 items-center justify-center gap-1.5 rounded-lg px-2 py-2 text-xs font-medium transition-all min-h-10 touch-manipulation sm:min-w-0 sm:flex-col sm:gap-2 sm:rounded-xl sm:px-3 sm:py-3 sm:min-h-0',
                'hover:shadow-sm',
                isActive
                  ? 'bg-surface-active shadow-sm ring-1 ring-border-strong border border-transparent'
                  : 'bg-transparent border border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors sm:h-12 sm:w-12 sm:rounded-lg',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface-muted text-muted-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                </div>
                <span
                  className={cn(
                    'text-[11px] leading-tight font-medium truncate sm:text-sm sm:whitespace-normal',
                    isActive ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {tab.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
