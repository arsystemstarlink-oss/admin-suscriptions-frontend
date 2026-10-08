import { type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface DetailNavProps {
  backTo?: string
  backLabel?: string
  title?: ReactNode
  actions?: ReactNode
  className?: string
}

export function DetailNav({ backTo, backLabel = 'Volver', title, actions, className }: DetailNavProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const handleBack = () => {
    const from = (location.state as { from?: string } | null)?.from
    if (typeof from === 'string' && from.startsWith('/')) {
      navigate(from)
    } else if (location.key !== 'default') {
      navigate(-1)
    } else if (backTo) {
      navigate(backTo)
    } else {
      navigate(-1)
    }
  }

  return (
    <div className={cn('sticky top-0 z-20 flex items-center justify-between py-3 bg-background/95 backdrop-blur-md mb-2 -mx-4 px-4', className)}>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleBack}
          className="flex items-center justify-center w-10 h-10 rounded-full bg-surface text-surface-foreground border border-border shadow-sm active:scale-95 transition-transform touch-manipulation"
          aria-label={backLabel}
        >
          <ArrowLeft className="h-5 w-5 shrink-0" />
        </button>
        {title && <div className="min-w-0">{title}</div>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  )
}
