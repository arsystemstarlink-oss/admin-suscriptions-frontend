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

export function getWhatsAppUrl(message: string): string | null {
  const phone = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, '')
  return phone && /^\d{8,15}$/.test(phone)
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : null
}
