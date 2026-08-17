import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ListCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function ListCard({ children, className, onClick }: ListCardProps) {
  const baseClasses = 'bg-white dark:bg-primary-900/50 border border-primary-100 dark:border-primary-800 rounded-2xl shadow-sm p-4 transition-all'
  const interactiveClasses = onClick ? 'active:scale-[0.98] active:bg-primary-50 dark:active:bg-primary-800 touch-manipulation cursor-pointer' : ''

  return (
    <div
      className={cn(baseClasses, interactiveClasses, className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
