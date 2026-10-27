const MONTH_NAMES_ES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
]

export function parseDateOnly(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function sameDay(a: Date, b: Date): boolean {
  return a.getTime() === b.getTime()
}

export function formatPeriodLabel(startDate: Date, endDate: Date): string {
  return `${MONTH_NAMES_ES[startDate.getUTCMonth()]} - ${MONTH_NAMES_ES[endDate.getUTCMonth()]}`
}

export function nextBillingDayAfter(referenceDate: Date, billingDay: number): Date {
  const year = referenceDate.getUTCFullYear()
  const month = referenceDate.getUTCMonth()
  const day = referenceDate.getUTCDate()
  const sameMonth = Date.UTC(year, month, billingDay)

  return sameMonth <= Date.UTC(year, month, day)
    ? new Date(Date.UTC(year, month + 1, billingDay))
    : new Date(sameMonth)
}

export function nextBillingPeriodEnd(periodStart: Date, billingDay: number): Date {
  return new Date(
    Date.UTC(periodStart.getUTCFullYear(), periodStart.getUTCMonth() + 1, billingDay),
  )
}

export function findAlignedBillingPeriod(
  startDate: string,
  endDate: string,
  activationDate: string,
  billingDay: number,
): { startDate: Date; endDate: Date; label: string } | null {
  if (!startDate || !endDate || !activationDate) return null

  const start = parseDateOnly(startDate)
  const end = parseDateOnly(endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null

  let periodStart = parseDateOnly(activationDate)
  let periodEnd = nextBillingDayAfter(periodStart, billingDay)

  for (let index = 0; index < 240; index++) {
    if (sameDay(periodStart, start)) {
      return sameDay(periodEnd, end)
        ? { startDate: periodStart, endDate: periodEnd, label: formatPeriodLabel(periodStart, periodEnd) }
        : null
    }
    if (periodStart.getTime() > start.getTime()) return null

    periodStart = periodEnd
    periodEnd = nextBillingPeriodEnd(periodStart, billingDay)
  }

  return null
}
