import type { Organization } from '@/types/api'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

export function getOrganizationPlanAccess(
  organization: Organization | null | undefined,
  now = new Date(),
) {
  const clientCount = organization?.clientCount
  const clientLimit = organization?.clientLimit
  const hasUsage =
    Number.isInteger(clientCount) && Number.isInteger(clientLimit) && clientLimit! > 0
  const usagePercent = hasUsage
    ? Math.min(100, Math.round((clientCount! / clientLimit!) * 100))
    : null
  const isAtLimit = hasUsage && clientCount! >= clientLimit!
  const trialEndsAt = organization?.trialEndsAt ? Date.parse(organization.trialEndsAt) : NaN
  const planExpiresAt = organization?.planExpiresAt ? Date.parse(organization.planExpiresAt) : NaN
  const trialExpired =
    organization?.planStatus === 'prueba' &&
    Number.isFinite(trialEndsAt) &&
    trialEndsAt <= now.getTime()
  const planExpired =
    organization?.planStatus === 'activo' &&
    Number.isFinite(planExpiresAt) &&
    planExpiresAt <= now.getTime()
  const isReadOnly =
    organization?.planStatus === 'vencido' ||
    organization?.planStatus === 'suspendido' ||
    trialExpired ||
    planExpired
  const trialDaysRemaining =
    organization?.planStatus === 'prueba' && Number.isFinite(trialEndsAt)
      ? Math.max(0, Math.ceil((trialEndsAt - now.getTime()) / DAY_IN_MILLISECONDS))
      : null

  return {
    clientCount: hasUsage ? clientCount! : null,
    clientLimit: hasUsage ? clientLimit! : null,
    usagePercent,
    isAtLimit,
    isReadOnly,
    trialDaysRemaining,
  }
}

export function isOrganizationPlanLocked(
  organization: Organization | null | undefined,
  now = new Date(),
) {
  if (organization?.planStatus === 'activo') {
    if (!organization.planExpiresAt) return true
    return Date.parse(organization.planExpiresAt) > now.getTime()
  }
  if (organization?.planStatus === 'prueba') {
    return Boolean(
      organization.trialEndsAt && Date.parse(organization.trialEndsAt) > now.getTime(),
    )
  }
  return false
}

export function getOrganizationBillingDay(
  organization: Organization | null | undefined,
): number {
  if (
    typeof organization?.billingDay === 'number' &&
    Number.isInteger(organization.billingDay)
  ) {
    return Math.min(Math.max(organization.billingDay, 1), 28)
  }
  const anchor =
    organization?.createdAt ?? organization?.planExpiresAt ?? organization?.trialEndsAt
  const date = anchor ? new Date(anchor) : new Date()
  return Math.min(Math.max(date.getUTCDate(), 1), 28)
}

export const MAX_PREPAID_MONTHS = 12

export function isOrganizationPlanChange(input: {
  currentPlan?: Organization['plan']
  targetPlan?: Organization['plan']
  planStatus?: Organization['planStatus']
}): boolean {
  return (
    input.planStatus === 'activo' &&
    Boolean(input.currentPlan && input.targetPlan && input.currentPlan !== input.targetPlan)
  )
}

export function addOrganizationBillingMonths(
  base: Date,
  months: number,
  billingDay: number,
): Date {
  const day = Math.min(Math.max(Math.trunc(billingDay), 1), 28)
  const targetMonth = new Date(
    Date.UTC(
      base.getUTCFullYear(),
      base.getUTCMonth() + (base.getUTCDate() >= day ? 1 : 0),
      1,
    ),
  )
  targetMonth.setUTCMonth(targetMonth.getUTCMonth() + Math.max(months - 1, 0))
  const year = targetMonth.getUTCFullYear()
  const month = targetMonth.getUTCMonth()
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(day, lastDay), 23, 59, 59, 999))
}

export function resolveOrganizationPlanExpiration(input: {
  organization: Organization
  paidAt: Date
  months: number
  currentPlan?: Organization['plan']
  targetPlan?: Organization['plan']
  now?: Date
}): Date {
  const now = input.now ?? new Date()
  const { organization, paidAt } = input
  const planExpiresAt = organization.planExpiresAt
    ? Date.parse(organization.planExpiresAt)
    : Number.NaN
  const trialEndsAt = organization.trialEndsAt ? Date.parse(organization.trialEndsAt) : Number.NaN
  const planChanged = isOrganizationPlanChange({
    currentPlan: input.currentPlan,
    targetPlan: input.targetPlan,
    planStatus: organization.planStatus,
  })
  const paidActive =
    !planChanged &&
    organization.planStatus === 'activo' &&
    Number.isFinite(planExpiresAt) &&
    planExpiresAt > now.getTime()
  const trialActive =
    organization.planStatus === 'prueba' &&
    Number.isFinite(trialEndsAt) &&
    trialEndsAt > now.getTime()

  const base = paidActive
    ? new Date(planExpiresAt)
    : trialActive
      ? new Date(trialEndsAt)
      : new Date(Math.max(paidAt.getTime(), now.getTime()))

  return addOrganizationBillingMonths(
    base,
    input.months,
    getOrganizationBillingDay(organization),
  )
}

export function getMaxPrepaidPlanExpiration(
  billingDay: number,
  now = new Date(),
): Date {
  return addOrganizationBillingMonths(now, MAX_PREPAID_MONTHS, billingDay)
}

export function getWhatsAppUrl(message: string): string | null {
  const phone = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, '')
  return phone && /^\d{8,15}$/.test(phone)
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : null
}
