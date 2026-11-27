import { forwardRef, type ComponentPropsWithoutRef, type ElementRef } from 'react'
import type { LucideIcon } from 'lucide-react'
import { TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'

export const SettingsTabsList = forwardRef<
  ElementRef<typeof TabsList>,
  ComponentPropsWithoutRef<typeof TabsList>
>(({ className, ...props }, ref) => (
  <TabsList
    ref={ref}
    className={cn(
      'grid h-auto w-full gap-1 rounded-xl border border-border-subtle bg-surface-muted p-1 text-muted-foreground sm:gap-2',
      className,
    )}
    {...props}
  />
))
SettingsTabsList.displayName = 'SettingsTabsList'

interface SettingsTabTriggerProps extends ComponentPropsWithoutRef<typeof TabsTrigger> {
  icon: LucideIcon
  label: string
  /** Etiqueta corta para móviles, donde cada pestaña comparte la fila con las demás. */
  shortLabel?: string
}

export const SettingsTabTrigger = forwardRef<
  ElementRef<typeof TabsTrigger>,
  SettingsTabTriggerProps
>(({ icon: Icon, label, shortLabel, className, ...props }, ref) => (
  <TabsTrigger
    ref={ref}
    className={cn(
      'flex min-h-11 min-w-0 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1.5 text-xs leading-tight data-[state=active]:bg-surface data-[state=active]:text-surface-foreground data-[state=active]:shadow-sm sm:flex-row sm:gap-2 sm:px-2 sm:py-2 sm:text-sm',
      className,
    )}
    {...props}
  >
    <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
    <span className="max-w-full truncate">
      {shortLabel ? (
        <>
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </>
      ) : (
        label
      )}
    </span>
  </TabsTrigger>
))
SettingsTabTrigger.displayName = 'SettingsTabTrigger'
