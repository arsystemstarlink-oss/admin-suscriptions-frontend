import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  CO_COUNTRY_CODE,
  VE_COUNTRY_CODE,
  buildPhoneE164,
  formatPhone,
  getPhoneCountryCode,
  normalizePhoneDigits,
  type PhoneCountryCode,
} from '@/lib/phone'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export interface PhoneInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  value?: string
  onValueChange?: (value: string) => void
}

const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value = '', onValueChange, onBlur, ...props }, ref) => {
    const detectedCountry = getPhoneCountryCode(value)
    const [countryCode, setCountryCode] = React.useState<PhoneCountryCode>(detectedCountry)

    React.useEffect(() => {
      if (value) setCountryCode(getPhoneCountryCode(value))
    }, [value])

    const nationalDigits = normalizePhoneDigits(value, countryCode)

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextNational = normalizePhoneDigits(event.target.value, countryCode)
      onValueChange?.(buildPhoneE164(nextNational, countryCode))
    }

    const handleCountryChange = (nextCountry: PhoneCountryCode) => {
      setCountryCode(nextCountry)
      onValueChange?.(buildPhoneE164(nationalDigits, nextCountry))
    }

    return (
      <div className="flex gap-2">
        <Select value={countryCode} onValueChange={(next) => handleCountryChange(next as PhoneCountryCode)}>
          <SelectTrigger
            className={cn('h-12 w-24 shrink-0 px-3', props.disabled && 'cursor-not-allowed')}
            aria-label="Código de país"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={VE_COUNTRY_CODE}>+58 VE</SelectItem>
            <SelectItem value={CO_COUNTRY_CODE}>+57 CO</SelectItem>
          </SelectContent>
        </Select>
        <Input
          {...props}
          ref={ref}
          type="tel"
          inputMode="numeric"
          autoComplete="new-password"
          data-1p-ignore
          data-lpignore="true"
          placeholder={countryCode === CO_COUNTRY_CODE ? '300-123-4567' : '416-100-56-06'}
          className={cn('min-w-0 flex-1', className)}
          value={formatPhone(nationalDigits, countryCode)}
          onChange={handleChange}
          onBlur={onBlur}
        />
      </div>
    )
  }
)
PhoneInput.displayName = 'PhoneInput'

export { PhoneInput }
