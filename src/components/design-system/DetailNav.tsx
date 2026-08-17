import { type ReactNode } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'

interface DetailNavProps {
  backTo?: string
  backLabel?: string
  title?: ReactNode
  actions?: ReactNode
  className?: string
}

export function DetailNav({ backTo, backLabel = 'Volver', title, actions, className }: DetailNavProps) {
  const backButton = (
    <button
      className="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-primary-900 border border-primary-100 dark:border-primary-800 text-primary-600 dark:text-primary-300 shadow-sm active:scale-95 transition-transform touch-manipulation"
      aria-label={backLabel}
    >
      <ArrowLeft className="h-5 w-5 shrink-0" />
    </button>
  )

  return (
    <div className={cn('sticky top-0 z-20 flex items-center justify-between py-3 bg-slate-50/90 dark:bg-primary-950/90 backdrop-blur-md mb-2 -mx-4 px-4', className)}>
      <div className="flex items-center gap-3">
        {backTo ? (
          <Link to={backTo}>{backButton}</Link>
        ) : (
          backButton
        )}
        {title && <div className="min-w-0">{title}</div>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
