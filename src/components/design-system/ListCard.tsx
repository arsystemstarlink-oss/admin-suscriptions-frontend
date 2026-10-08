import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Slot } from '@radix-ui/react-slot'

interface ListCardProps {
  children: ReactNode
  className?: string
  onClick?: () => void
  asChild?: boolean
}

export function ListCard({ children, className, onClick, asChild = false }: ListCardProps) {
  const baseClasses = 'bg-surface text-surface-foreground border border-border rounded-2xl shadow-sm p-4 transition-all'
  const interactiveClasses = onClick || asChild ? 'active:scale-[0.98] active:bg-surface-active touch-manipulation cursor-pointer' : ''
  const Component = asChild ? Slot : 'div'

  return (
    <Component
      className={cn(baseClasses, asChild && 'block', interactiveClasses, className)}
      onClick={onClick}
    >
      {children}
    </Component>
  )
}
