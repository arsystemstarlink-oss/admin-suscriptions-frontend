import {
  PaymentMethod,
  SubscriptionStatus,
  BillingPeriodStatus,
  type BusinessPlanKey,
} from '@/types/api'

export const CUSTOM_PLAN_MIN_CLIENTS = 301
export const PLAN_USAGE_WARNING_PERCENT = 80

export const BUSINESS_PLANS = {
  basico: { label: 'Básico', clientLimit: 30, priceUsdMonthly: 15, trialDays: 14 },
  pro: { label: 'Pro', clientLimit: 150, priceUsdMonthly: 25, trialDays: 0 },
  negocio: { label: 'Negocio', clientLimit: 300, priceUsdMonthly: 40, trialDays: 0 },
  'a-medida': { label: 'A medida', clientLimit: null, priceUsdMonthly: null, trialDays: 0 },
} as const satisfies Record<
  BusinessPlanKey,
  {
    label: string
    clientLimit: number | null
    priceUsdMonthly: number | null
    trialDays: number
  }
>

export const ORGANIZATION_PLAN_STATUS_LABELS = {
  prueba: 'Prueba',
  activo: 'Activo',
  vencido: 'Vencido',
  suspendido: 'Suspendido',
} as const

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Efectivo',
  [PaymentMethod.TRANSFER]: 'Transferencia',
  [PaymentMethod.USDT]: 'USDT',
  [PaymentMethod.CARD]: 'Tarjeta',
  [PaymentMethod.INITIAL_PAYMENT]: 'Pago Inicial',
  [PaymentMethod.OTHER]: 'Otro',
}

export const SUBSCRIPTION_STATUS_LABELS: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: 'Activa',
  [SubscriptionStatus.SUSPENDED]: 'Suspendida',
}

export const BILLING_PERIOD_STATUS_LABELS: Record<BillingPeriodStatus, string> = {
  [BillingPeriodStatus.PENDING]: 'Pendiente',
  [BillingPeriodStatus.PAID]: 'Pagado',
  [BillingPeriodStatus.OVERDUE]: 'Vencido',
}

export const STATUS_SUCCESS =
  'bg-success/10 text-success border border-success/20'
export const STATUS_WARNING =
  'bg-warning/10 text-warning border border-warning/20'
export const STATUS_ERROR =
  'bg-destructive/10 text-destructive border border-destructive/20'
export const STATUS_INFO =
  'bg-info/10 text-info border border-info/20'

export const SUBSCRIPTION_STATUS_COLORS: Record<SubscriptionStatus, string> = {
  [SubscriptionStatus.ACTIVE]: STATUS_SUCCESS,
  [SubscriptionStatus.SUSPENDED]: STATUS_INFO,
}

export const BILLING_PERIOD_STATUS_COLORS: Record<BillingPeriodStatus, string> = {
  [BillingPeriodStatus.PENDING]: STATUS_WARNING,
  [BillingPeriodStatus.PAID]: STATUS_SUCCESS,
  [BillingPeriodStatus.OVERDUE]: STATUS_ERROR,
}

export const CLIENT_SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  SUSPENDED: 'Suspendido',
  MIXED: 'Mixto',
  NONE: 'Sin suscripciones',
}

export const CLIENT_SUBSCRIPTION_STATUS_COLORS: Record<string, string> = {
  ACTIVE: STATUS_SUCCESS,
  SUSPENDED: STATUS_INFO,
  MIXED: STATUS_WARNING,
  NONE: STATUS_INFO,
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('es-MX', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function isExpiringSoon(endDate: string, daysThreshold: number = 7): boolean {
  const today = new Date()
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const end = new Date(endDate)
  const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  const diffTime = endUTC - todayUTC
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays >= 0 && diffDays <= daysThreshold
}

export function getExpiringLabel(endDate: string): string {
  const today = new Date()
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const end = new Date(endDate)
  const endUTC = Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate())
  const diffTime = endUTC - todayUTC
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  
  if (diffDays < 0) return 'Vencido'
  if (diffDays === 0) return 'Vence hoy'
  if (diffDays === 1) return 'Vence mañana'
  return `Vence en ${diffDays} días`
}
