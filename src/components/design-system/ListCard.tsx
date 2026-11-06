import { type KeyboardEvent, type ReactNode } from 'react'
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
      className={cn(baseClasses, asChild && 'block', interactiveClasses, onClick && !asChild && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring', className)}
      onClick={onClick}
      {...(onClick && !asChild
        ? {
            role: 'button',
            tabIndex: 0,
            onKeyDown: (event: KeyboardEvent<HTMLElement>) => {
              if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault()
                onClick()
              }
            },
          }
        : {})}
    >
      {children}
    </Component>
  )
}
