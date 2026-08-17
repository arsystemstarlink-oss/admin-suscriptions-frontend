import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  VE_COUNTRY_CODE,
  buildVenezuelanE164,
  formatVenezuelanPhone,
  normalizeVenezuelanDigits,
} from '@/lib/phone'

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: string
  onValueChange?: (value: string) => void
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onValueChange, onBlur, ...props }, ref) => {
    const nationalDigits = normalizeVenezuelanDigits(value)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextNational = normalizeVenezuelanDigits(event.target.value)
      onValueChange?.(buildVenezuelanE164(nextNational))
    }

    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
          {VE_COUNTRY_CODE}
        </span>
        <Input
          {...props}
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="new-password"
          data-1p-ignore
          data-lpignore="true"
          placeholder="416-100-56-06"
          className={cn('pl-12', className)}
          value={formatVenezuelanPhone(nationalDigits)}
          onChange={handleChange}
          onBlur={onBlur}
        />
      </div>
    )
  }
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
