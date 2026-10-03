import { cn } from '@/lib/utils'
import { APP_NAME } from '@/lib/brand'

type BrandMarkSize = 'sm' | 'md' | 'lg' | 'xl'
type BrandMarkVariant = 'auto' | 'light' | 'dark'

interface BrandMarkProps {
  size?: BrandMarkSize
  /** Oculta "SYSTEM" en viewports < sm */
  hideSystemOnMobile?: boolean
  /** Override del color. Por defecto 'auto': sigue el tema (light/dark) del app. 'light': texto claro para fondos fijos oscuros (bg-header) */
  variant?: BrandMarkVariant
  className?: string
}

const sizeMap: Record<BrandMarkSize, string> = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
  xl: 'text-4xl',
}

const variantMap: Record<BrandMarkVariant, string> = {
  auto: 'text-foreground/95',
  light: 'text-header-foreground',
  dark: 'text-foreground/95',
}

/**
 * Wordmark A|R SYSTEM
 * - A, R y SYSTEM siguen el tema del app (token foreground)
 * - | en color secondary (amarillo/oro de marca)
 */
export function BrandMark({
  size = 'md',
  hideSystemOnMobile = false,
  variant = 'auto',
  className,
}: BrandMarkProps) {
  const colorClass = variantMap[variant]
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