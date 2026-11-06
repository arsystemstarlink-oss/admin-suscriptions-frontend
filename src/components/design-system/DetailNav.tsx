import { type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { getNavigationBackLabel, getNavigationStatePath } from '@/lib/navigation'

interface DetailNavProps {
  backTo?: string
  backState?: unknown
  backLabel?: string
  title?: ReactNode
  actions?: ReactNode
  className?: string
}

export function DetailNav({
  backTo,
  backState,
  backLabel = 'Volver',
  title,
  actions,
  className,
}: DetailNavProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const from = getNavigationStatePath(location.state, 'from')
  const backTarget = from ?? backTo ?? '/dashboard'
  const resolvedBackLabel = getNavigationBackLabel(backTarget, backLabel)

  const handleBack = () => {
    navigate(backTarget, { replace: true, state: backState })
  }

  return (
    <div className={cn('sticky top-0 z-20 flex items-center justify-between py-3 bg-background/95 backdrop-blur-md mb-2 -mx-4 px-4', className)}>
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex h-10 max-w-48 min-w-0 items-center justify-center gap-2 rounded-full border border-border bg-surface px-3 text-sm font-medium text-surface-foreground shadow-sm transition-transform active:scale-95 touch-manipulation"
          aria-label={resolvedBackLabel}
          title={resolvedBackLabel}
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
          <span className="min-w-0 truncate">{resolvedBackLabel}</span>
        </button>
        {title && <div className="min-w-0">{title}</div>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-3">{actions}</div>}
    </div>
  )
}
