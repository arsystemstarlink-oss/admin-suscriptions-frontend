import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface FilterPillProps {
  children: ReactNode
  active?: boolean
  variant?: 'default' | 'destructive' | 'secondary'
  onClick?: () => void
  className?: string
}

export function FilterPill({ children, active, variant = 'default', onClick, className }: FilterPillProps) {
  const baseClasses = 'inline-flex shrink-0 items-center whitespace-nowrap px-3 sm:px-4 py-1.5 min-h-8 rounded-full text-xs sm:text-sm font-medium transition-colors active:scale-95 touch-manipulation'

  const activeClasses = {
    default: 'bg-primary text-primary-foreground',
    destructive: 'bg-destructive text-destructive-foreground',
    secondary: 'bg-secondary text-secondary-foreground',
  }

  const inactiveClasses = {
    default: 'bg-surface text-muted-foreground border border-border',
    destructive: 'bg-surface text-muted-foreground border border-border',
    secondary: 'bg-secondary/15 text-secondary-foreground border border-secondary/30',
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        baseClasses,
        active ? activeClasses[variant] : inactiveClasses[variant],
        className
      )}
    >
      {children}
    </button>
  )
}
