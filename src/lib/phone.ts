export const VE_COUNTRY_CODE = '+58'
export const CO_COUNTRY_CODE = '+57'
export const PHONE_COUNTRY_CODES = [VE_COUNTRY_CODE, CO_COUNTRY_CODE] as const
export type PhoneCountryCode = (typeof PHONE_COUNTRY_CODES)[number]
export const VE_MAX_NATIONAL_DIGITS = 11

export function getPhoneCountryCode(value: string): PhoneCountryCode {
  const digits = value.replace(/\D/g, '')
  if (digits.startsWith('57')) return CO_COUNTRY_CODE
  return VE_COUNTRY_CODE
}

export function normalizePhoneDigits(value: string, countryCode: PhoneCountryCode): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)

  const countryDigits = countryCode.slice(1)
  if (digits.startsWith(countryDigits)) digits = digits.slice(countryDigits.length)
  if (digits.startsWith('0')) digits = digits.slice(1)

  return digits.slice(0, countryCode === CO_COUNTRY_CODE ? 10 : VE_MAX_NATIONAL_DIGITS)
}

export function formatPhone(nationalDigits: string, countryCode: PhoneCountryCode): string {
  if (!nationalDigits) return ''
  if (countryCode === CO_COUNTRY_CODE) {
    const groups = [
      nationalDigits.slice(0, 3),
      nationalDigits.slice(3, 6),
      nationalDigits.slice(6, 10),
    ].filter(Boolean)
    return groups.join('-')
  }
  return formatVenezuelanPhone(nationalDigits)
}

export function buildPhoneE164(nationalDigits: string, countryCode: PhoneCountryCode): string {
  return nationalDigits ? `${countryCode}${nationalDigits}` : ''
}

export function isValidInternationalPhone(value: string): boolean {
  return /^\+58\d{10,11}$/.test(value) || /^\+57\d{10}$/.test(value)
}

export function normalizeVenezuelanDigits(value: string): string {
  let digits = value.replace(/\D/g, '')
  if (digits.startsWith('00')) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('58')) {
    digits = digits.slice(2)
  }
  if (digits.startsWith('0')) {
    digits = digits.slice(1)
  }
  return digits.slice(0, VE_MAX_NATIONAL_DIGITS)
}

export function formatVenezuelanPhone(nationalDigits: string): string {
  if (!nationalDigits) return ''
  if (nationalDigits.length <= 3) return nationalDigits

  const area = nationalDigits.slice(0, 3)
  const rest = nationalDigits.slice(3)
  const groups = [area]
  let cursor = 0
  for (const size of [3, 2, 2]) {
    if (cursor >= rest.length) break
    groups.push(rest.slice(cursor, cursor + size))
    cursor += size
  }
  if (cursor < rest.length) {
    groups[groups.length - 1] += rest.slice(cursor)
  }
  return groups.join('-')
}

export function buildVenezuelanE164(nationalDigits: string): string {
  return nationalDigits ? `${VE_COUNTRY_CODE}${nationalDigits}` : ''
}
