import { type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import type { NavigationPreview } from '@/lib/navigation'

/** Bloque base: toda carga de contenido usa este mismo pulso, nunca un spinner. */
export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden="true" className={cn('animate-pulse rounded-xl bg-muted', className)} {...props} />
}

interface SkeletonGroupProps {
  label?: string
  className?: string
}

interface ListSkeletonProps extends SkeletonGroupProps {
  rows?: number
  rowClassName?: string
}

export function ListSkeleton({
  rows = 5,
  rowClassName = 'h-20 rounded-2xl',
  label = 'Cargando lista',
  className,
}: ListSkeletonProps) {
  return (
    <div role="status" aria-label={label} className={cn('space-y-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className={rowClassName} />
      ))}
    </div>
  )
}

interface DetailSkeletonProps extends SkeletonGroupProps {
  stats?: number
  sections?: number
  /** Nombre que ya se conoce desde la lista: se muestra de inmediato en vez de un bloque gris. */
  preview?: NavigationPreview
}

export function DetailSkeleton({
  stats = 3,
  sections = 3,
  label = 'Cargando detalle',
  preview,
  className,
}: DetailSkeletonProps) {
  return (
    <div role="status" aria-label={label} className={cn('space-y-4 px-2', className)}>
      {preview ? (
        <div className="mb-6 flex h-20 items-center gap-3 rounded-2xl border border-border bg-surface px-4 text-surface-foreground">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-muted text-lg font-bold text-surface-muted-foreground">
            {preview.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">{preview.title}</p>
            {preview.subtitle && <p className="truncate text-sm text-muted-foreground">{preview.subtitle}</p>}
          </div>
        </div>
      ) : (
        <Skeleton className="mb-6 h-20 rounded-2xl" />
      )}
      <div className="flex gap-2">
        {Array.from({ length: stats }, (_, i) => (
          <Skeleton key={i} className="h-24 flex-1" />
        ))}
      </div>
      <Skeleton className="my-4 h-10 w-full rounded-lg" />
      {Array.from({ length: sections }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-2xl" />
      ))}
    </div>
  )
}

export function FormSkeleton({ label = 'Cargando formulario', className }: SkeletonGroupProps) {
  return (
    <div role="status" aria-label={label} className={cn('space-y-4', className)}>
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-64 rounded-2xl" />
    </div>
  )
}

/** Fallback de las rutas diferidas dentro del layout autenticado. */
export function PageSkeleton({ label = 'Cargando página', className }: SkeletonGroupProps) {
  return (
    <div role="status" aria-label={label} className={cn('space-y-4', className)}>
      <Skeleton className="h-10" />
      <div className="space-y-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-20 rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
