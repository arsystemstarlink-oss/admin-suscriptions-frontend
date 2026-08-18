import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FormGroupProps {
  children: ReactNode
  label?: string
  description?: string
  className?: string
}

export function FormGroup({ children, label, description, className }: FormGroupProps) {
  return (
    <div className={cn('p-3 sm:p-4 bg-white dark:bg-primary-900/30 rounded-xl border border-primary-100 dark:border-primary-800', className)}>
      {(label || description) && (
        <div className="mb-3">
          {label && (
            <p className="text-sm font-semibold text-primary-900 dark:text-primary-100">{label}</p>
          )}
          {description && (
            <p className="text-xs text-primary-500 dark:text-primary-400 mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}
