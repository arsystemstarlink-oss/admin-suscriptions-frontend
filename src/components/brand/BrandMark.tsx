import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/brand'

type BrandMarkSize = 'sm' | 'md' | 'lg' | 'xl'

interface BrandMarkProps {
  size?: BrandMarkSize
  /** Oculta "SYSTEM" en viewports < sm */
  hideSystemOnMobile?: boolean
  /** Versión explícita: light (texto claro) o dark (texto oscuro) */
  variant?: 'light' | 'dark'
  className?: string
}

const sizeMap: Record<BrandMarkSize, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
}

/**
 * Wordmark A|R SYSTEM
 * - A, R y SYSTEM en blanco
 * - | en color secondary (amarillo/oro de marca)
 */
export function BrandMark({
  size = 'md',
  hideSystemOnMobile = false,
  variant,
  className,
}: BrandMarkProps) {
  const colorClass = variant === 'light'
    ? 'text-white/95'
    : variant === 'dark'
    ? 'text-foreground/95'
    : 'text-header-foreground'
  return (
    <span
      className={cn(
        'inline-flex shrink-0 items-baseline gap-1.5 font-black tracking-[0.18em] uppercase',
        sizeMap[size],
        colorClass,
        className,
      )}
      aria-label={APP_NAME}
      style={{ fontFeatureSettings: '"tnum"', fontVariantNumeric: 'tabular-nums' }}
    >
      <span className="inline-flex items-baseline">
        <span>A</span>
        <span className="text-secondary">|</span>
        <span>R</span>
      </span>
      <span className={cn('ml-0.5', hideSystemOnMobile && 'hidden sm:inline')}>SYSTEM</span>
    </span>
  )
}