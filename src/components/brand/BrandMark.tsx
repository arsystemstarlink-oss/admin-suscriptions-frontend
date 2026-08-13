import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/brand'

type BrandMarkSize = 'sm' | 'md' | 'lg'

interface BrandMarkProps {
  size?: BrandMarkSize
  /** Oculta "SYSTEM" en viewports < sm */
  hideSystemOnMobile?: boolean
  className?: string
}

const sizeMap: Record<BrandMarkSize, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
}

/**
 * Wordmark A|R SYSTEM
 * - A, R y SYSTEM en blanco
 * - | en color secondary (amarillo/oro de marca)
 */
export function BrandMark({
  size = 'md',
  hideSystemOnMobile = false,
  className,
}: BrandMarkProps) {
  return (
    <span
      className={cn(
        'inline-flex items-baseline gap-1.5 font-bold tracking-wider text-white',
        sizeMap[size],
        className,
      )}
      aria-label={APP_NAME}
    >
      <span className="font-black">
        A
        <span className="text-secondary-500">|</span>
        R
      </span>
      <span className={cn(hideSystemOnMobile && 'hidden sm:inline')}>SYSTEM</span>
    </span>
  )
}
