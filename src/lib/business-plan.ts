import type { Organization } from '@/types/api'

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000

/** Días de prueba del plan Básico cuando el catálogo del backend aún no está disponible. */
export const DEFAULT_TRIAL_DAYS = 14

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
  // Coincide con `isPlanExpired` del backend: un plan cuyo plazo ya pasó está en solo
  // lectura aunque el estado persistido siga diciendo 'prueba'/'activo'.
  const trialExpired =
    organization?.planStatus === 'prueba' &&
    Number.isFinite(trialEndsAt) &&
    trialEndsAt <= now.getTime()
  const planExpired =
    organization?.planStatus === 'activo' &&
    (!Number.isFinite(planExpiresAt) || planExpiresAt <= now.getTime())
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

/** Opciones de prepago que ofrece la interfaz; el backend valida `1..MAX_PREPAID_MONTHS`. */
export const PREPAID_MONTH_OPTIONS: number[] = [1, 3, 6, 12]

export function getWhatsAppUrl(message: string): string | null {
  const phone = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, '')
  return phone && /^\d{8,15}$/.test(phone)
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : null
}
