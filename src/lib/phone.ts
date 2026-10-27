export const VE_COUNTRY_CODE = '+58'
export const VE_MAX_NATIONAL_DIGITS = 11

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
