import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import {
  buildPhoneE164,
  formatPhone,
  getPhoneDialCode,
  getPhoneCountryCode,
  normalizePhoneDigits,
  isPhoneCountryCode,
  PHONE_COUNTRIES,
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
        <Select
          value={countryCode}
          onValueChange={(next) => {
            if (isPhoneCountryCode(next)) handleCountryChange(next)
          }}
        >
          <SelectTrigger
            className={cn('h-12 w-36 shrink-0 px-2', props.disabled && 'cursor-not-allowed')}
            aria-label="País y código telefónico"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PHONE_COUNTRIES.map((country) => (
              <SelectItem key={country.code} value={country.code}>
                {getPhoneDialCode(country.code)} {country.name}
              </SelectItem>
            ))}
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
          placeholder={
            PHONE_COUNTRIES.find((country) => country.code === countryCode)?.placeholder
          }
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
