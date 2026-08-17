import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {icon && <div className="mb-4 shrink-0">{icon}</div>}
      <h3 className="text-lg font-medium text-primary-800 dark:text-primary-100">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-primary-500 dark:text-primary-400 mt-1 max-w-[250px]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
