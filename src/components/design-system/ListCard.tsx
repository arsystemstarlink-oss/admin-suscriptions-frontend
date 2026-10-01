import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface ListCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
}

export function ListCard({ children, className, onClick }: ListCardProps) {
  const baseClasses = 'bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm p-4 transition-all'
  const interactiveClasses = onClick ? 'active:scale-[0.98] active:bg-surface-active touch-manipulation cursor-pointer' : ''

  return (
    <div
      className={cn(baseClasses, interactiveClasses, className)}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
