import { NavLink, useLocation } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
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
        className="flex w-full gap-1 overflow-x-auto rounded-lg bg-muted p-1 text-muted-foreground scrollbar-hide sm:grid sm:overflow-visible"
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
                'inline-flex min-h-10 min-w-10 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all hover:bg-muted hover:text-foreground sm:min-w-0 sm:flex-row sm:gap-1.5 sm:px-2 sm:text-sm',
                isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'
              )
            }
          >
            {({ isActive }) => (
              <>
                <tab.icon className="h-4 w-4 shrink-0" />
                <span className="max-w-[4.5rem] truncate sm:max-w-none">{tab.label}</span>
                {tab.badge != null && tab.badge > 0 && (
                  <Badge
                    variant={isActive ? 'destructive' : 'outline'}
                    className="ml-0.5 h-4 min-w-4 px-1 text-[10px] leading-none sm:ml-1"
                  >
                    {tab.badge > 99 ? '99+' : tab.badge}
                  </Badge>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
