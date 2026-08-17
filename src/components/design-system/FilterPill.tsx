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
  const baseClasses = 'inline-flex items-center whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors active:scale-95 touch-manipulation'

  const activeClasses = {
    default: 'bg-primary-800 text-white dark:bg-primary-700 dark:text-white',
    destructive: 'bg-red-600 text-white dark:bg-red-700',
    secondary: 'bg-secondary-600 text-secondary-foreground dark:bg-secondary-500',
  }

  const inactiveClasses = {
    default: 'bg-white text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700',
    destructive: 'bg-white text-primary-600 border border-primary-200 dark:bg-primary-900 dark:text-primary-300 dark:border-primary-700',
    secondary: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-900/30 dark:text-secondary-400',
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
