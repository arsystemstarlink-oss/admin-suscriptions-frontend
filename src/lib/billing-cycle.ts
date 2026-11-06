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

const MS_PER_DAY = 24 * 60 * 60 * 1000
const MIN_BILLING_CYCLE_DAYS = 28

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

// Debe coincidir con getFirstBillingPeriodEnd del backend: un primer período de menos de
// 28 días se une al ciclo siguiente, y el backend rechaza pagos que no encajen en el ciclo.
export function firstBillingPeriodEnd(activationDate: Date, billingDay: number): Date {
  const year = activationDate.getUTCFullYear()
  const month = activationDate.getUTCMonth()
  const day = activationDate.getUTCDate()
  const firstMonth = Date.UTC(year, month, billingDay) <= Date.UTC(year, month, day) ? month + 1 : month
  const end = new Date(Date.UTC(year, firstMonth, billingDay))
  const durationDays = (end.getTime() - activationDate.getTime()) / MS_PER_DAY

  return durationDays < MIN_BILLING_CYCLE_DAYS
    ? new Date(Date.UTC(year, firstMonth + 1, billingDay))
    : end
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
  let periodEnd = firstBillingPeriodEnd(periodStart, billingDay)

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
