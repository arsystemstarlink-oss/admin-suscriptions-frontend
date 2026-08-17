import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { BillingPeriod } from '@/types/api'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getClientFullName(client: { firstName: string; lastName: string }) {
  return `${client.firstName} ${client.lastName}`.trim()
}

export function hasOlderUnpaidPeriod(
  period: Pick<BillingPeriod, 'id' | 'subscriptionId' | 'startDate'>,
  allPeriods: Pick<BillingPeriod, 'id' | 'subscriptionId' | 'startDate' | 'status'>[]
): boolean {
  const periodStart = new Date(period.startDate).getTime()
  return allPeriods.some(
    (p) =>
      p.subscriptionId === period.subscriptionId &&
      p.id !== period.id &&
      new Date(p.startDate).getTime() < periodStart &&
      (p.status === 'PENDING' || p.status === 'OVERDUE')
  )
}

export function canPayCurrentPeriod(sub: {
  currentPeriod?: { status: string } | null
  overduePeriods: number
  pendingPeriods: number
}): boolean {
  const current = sub.currentPeriod
  if (!current || current.status === 'PAID') return false
  if (current.status === 'OVERDUE') {
    return sub.overduePeriods <= 1 && sub.pendingPeriods === 0
  }
  return sub.overduePeriods === 0 && sub.pendingPeriods <= 1
}
