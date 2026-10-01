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
    <div className={cn('p-3 sm:p-4 bg-surface-muted rounded-xl border border-border-subtle', className)}>
      {(label || description) && (
        <div className="mb-3">
          {label && (
            <p className="text-sm font-semibold text-foreground">{label}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-3">
        {children}
      </div>
    </div>
  )
}
