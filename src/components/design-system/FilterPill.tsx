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
    default: 'bg-surface text-muted-foreground border border-border hover:bg-surface-hover',
    destructive: 'bg-surface text-muted-foreground border border-border hover:bg-surface-hover',
    // secondary-foreground es azul oscuro fijo (solo legible sobre amarillo sólido):
    // en dark sobre bg-surface daría ~1.6:1. Inactivo usa muted-foreground (>=4.5:1
    // en ambos modos) y conserva el acento amarillo solo en el border; activo usa
    // el par sólido bg-secondary text-secondary-foreground (~11.7:1).
    secondary: 'bg-surface text-muted-foreground border border-secondary/40 hover:bg-surface-hover hover:text-foreground',
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
