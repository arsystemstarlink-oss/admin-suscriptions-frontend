import {
  AsYouType,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

export const PHONE_COUNTRIES = [
  { code: 'CO', name: 'Colombia', placeholder: '300 123 4567' },
  { code: 'BR', name: 'Brasil', placeholder: '(11) 91234-5678' },
  { code: 'AR', name: 'Argentina', placeholder: '011 15-2345-6789' },
  { code: 'VE', name: 'Venezuela', placeholder: '0412-1234567' },
  { code: 'BO', name: 'Bolivia', placeholder: '71234567' },
  { code: 'CL', name: 'Chile', placeholder: '912345678' },
] as const satisfies readonly { code: CountryCode; name: string; placeholder: string }[]

export type PhoneCountryCode = (typeof PHONE_COUNTRIES)[number]['code']

export const PHONE_VALIDATION_MESSAGE =
  'Ingresa un teléfono válido para el país seleccionado.'

export function isPhoneCountryCode(value: string): value is PhoneCountryCode {
  return PHONE_COUNTRIES.some((country) => country.code === value)
}

export function getPhoneDialCode(countryCode: PhoneCountryCode): string {
  return `+${getCountryCallingCode(countryCode)}`
}

export function getPhoneCountryCode(value: string): PhoneCountryCode {
  const digits = value.replace(/\D/g, '').replace(/^00/, '')
  const country = PHONE_COUNTRIES.find((item) =>
    digits.startsWith(getCountryCallingCode(item.code)),
  )
  return country?.code ?? 'VE'
}

export function normalizePhoneDigits(value: string, countryCode: PhoneCountryCode): string {
  const parsed = parsePhoneNumberFromString(value)
  if (parsed) return parsed.nationalNumber

  let digits = value.replace(/\D/g, '').replace(/^00/, '')
  const callingCode = getCountryCallingCode(countryCode)
  if (digits.startsWith(callingCode)) digits = digits.slice(callingCode.length)

  const formatter = new AsYouType(countryCode)
  formatter.input(digits)
  return formatter.getNumber()?.nationalNumber ?? digits
}

export function formatPhone(nationalDigits: string, countryCode: PhoneCountryCode): string {
  if (!nationalDigits) return ''

  const parsed = parsePhoneNumberFromString(nationalDigits, countryCode)
  if (parsed?.isPossible()) return parsed.formatNational()

  return new AsYouType(countryCode).input(nationalDigits)
}

export function buildPhoneE164(nationalNumber: string, countryCode: PhoneCountryCode): string {
  const input = nationalNumber.trim()
  if (!input) return ''

  const normalizedInput = input.startsWith('00') ? `+${input.slice(2)}` : input
  const parsed = parsePhoneNumberFromString(normalizedInput, countryCode)
  if (parsed) return parsed.number

  const formatter = new AsYouType(countryCode)
  formatter.input(input)
  const formattedNumber = formatter.getNumber()
  if (formattedNumber) return formattedNumber.number

  const digits = input.replace(/\D/g, '')
  const callingCode = getCountryCallingCode(countryCode)
  const nationalDigits = digits.startsWith(callingCode)
    ? digits.slice(callingCode.length)
    : digits
  return nationalDigits ? `+${callingCode}${nationalDigits}` : ''
}

export function isValidInternationalPhone(value: string): boolean {
  if (!value.startsWith('+')) return false

  const parsed = parsePhoneNumberFromString(value)
  return Boolean(parsed?.isValid() && parsed.country && isPhoneCountryCode(parsed.country))
}
