import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SectionHeaderProps {
  title: string
  icon?: ReactNode
  badge?: ReactNode
  total?: string | number
  action?: ReactNode
  className?: string
}

export function SectionHeader({ title, icon, badge, total, action, className }: SectionHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-2 p-3 rounded-lg sm:flex-row sm:items-center sm:justify-between', className)}>
      <div className="flex items-center gap-2 min-w-0">
        {icon && <span className="shrink-0">{icon}</span>}
        <h3 className="font-semibold text-sm sm:text-base min-w-0 leading-snug">{title}</h3>
        {badge && <span className="shrink-0">{badge}</span>}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {total !== undefined && (
          <p className="font-bold text-sm sm:text-base">{total}</p>
        )}
        {action && <div className="flex items-center gap-2">{action}</div>}
      </div>
    </div>
  )
}
