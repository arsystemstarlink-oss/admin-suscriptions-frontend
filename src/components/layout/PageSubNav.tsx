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
    <div className="space-y-4 md:space-y-6">
      {(headerTitle || headerSubtitle) && (
        <div>
          {headerTitle && (
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {headerTitle}
            </h1>
          )}
          {headerSubtitle && (
            <p className="text-muted-foreground mt-1 text-sm md:text-base">{headerSubtitle}</p>
          )}
        </div>
      )}

      <nav
        className="grid w-full gap-3 rounded-2xl bg-white p-2 text-muted-foreground border border-primary-100 dark:bg-primary-900/50 dark:border-primary-800"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
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
                'inline-flex min-w-0 flex-col items-center justify-center gap-2 rounded-xl px-3 py-3 text-xs font-medium transition-all',
                'hover:shadow-sm hover:border-primary/40',
                isActive
                  ? 'bg-primary-50 dark:bg-primary-800/50 shadow-sm ring-1 ring-primary/20 border border-transparent'
                  : 'bg-transparent border border-transparent'
              )
            }
          >
            {({ isActive }) => (
              <>
                <div
                  className={cn(
                    'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors sm:h-12 sm:w-12',
                    isActive
                      ? 'bg-primary-100 dark:bg-primary-700 text-primary-600 dark:text-primary-200'
                      : 'bg-primary-50 dark:bg-primary-900 text-muted-foreground'
                  )}
                >
                  <tab.icon className="h-4 w-4 shrink-0 sm:h-5 sm:w-5" />
                </div>
                <span
                  className={cn(
                    'text-xs font-medium sm:text-sm',
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
