import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { BillingPeriod } from '@/types/api'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getClientFullName(client: { firstName: string; lastName: string }) {
  return `${client.firstName} ${client.lastName}`.trim()
}

export function normalizeDni(raw: string): string {
  const cleaned = raw.trim().toUpperCase().replace(/[^VJ0-9-]/g, '')
  const prefix = cleaned.match(/[VJ]/)?.[0] ?? ''
  const digits = cleaned.replace(/[^0-9]/g, '')
  if (!digits) return ''
  return prefix ? `${prefix}-${digits}` : digits
}

export function isValidDni(dni: string): boolean {
  return /^[VJ]-\d{7,9}$/.test(dni)
}

export function getInitial(value: string | null | undefined, fallback = '?'): string {
  const trimmed = value?.trim()
  if (!trimmed) return fallback

  const firstGrapheme = getFirstGrapheme(trimmed)
  if (!firstGrapheme) return fallback

  return firstGrapheme.toLocaleUpperCase('es')
}

function getFirstGrapheme(value: string): string | undefined {
  if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
    const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
    const first = segmenter.segment(value)[Symbol.iterator]().next().value
    return first?.segment
  }

  return Array.from(value)[0]
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
