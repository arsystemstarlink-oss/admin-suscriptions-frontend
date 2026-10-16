import { qk } from '@/lib/query-keys'

export const PUSH_MESSAGE_TYPE = 'PUSH_RECEIVED'

export interface PushMessageData {
  type?: string
  url?: string
  [key: string]: unknown
}

interface PushMessage {
  type?: string
  data?: PushMessageData
}

const WHATSAPP = [qk.whatsapp.conversations]
const PAYMENT_REPORTS = [qk.paymentReports.lists, qk.paymentReports.count]
const SUBSCRIPTIONS = [qk.subscriptions.lists]
const BILLING = [qk.billing.lists]
const DASHBOARD = [qk.dashboard.summary, qk.dashboard.alerts]
const SCHEDULER = [qk.scheduler.config, qk.scheduler.logs]

const BY_TYPE: Record<string, readonly (readonly unknown[])[]> = {
  'whatsapp-message': WHATSAPP,
  'payment-report': [...PAYMENT_REPORTS, ...BILLING, ...SUBSCRIPTIONS, ...DASHBOARD],
  'subscription-expiring': [...SUBSCRIPTIONS, ...BILLING, ...DASHBOARD],
  'billing-period': [...BILLING, ...DASHBOARD],
  payment: [...PAYMENT_REPORTS, ...BILLING, ...DASHBOARD],
  scheduler: [...SCHEDULER, ...DASHBOARD],
}

const BY_URL: Array<{ prefix: string; keys: readonly (readonly unknown[])[] }> = [
  { prefix: '/chats', keys: WHATSAPP },
  { prefix: '/whatsapp', keys: WHATSAPP },
  { prefix: '/payment-reports', keys: PAYMENT_REPORTS },
  { prefix: '/subscriptions', keys: SUBSCRIPTIONS },
  { prefix: '/billing', keys: BILLING },
  { prefix: '/dashboard', keys: DASHBOARD },
  { prefix: '/scheduler', keys: SCHEDULER },
]

/**
 * Traduce el payload del push a las claves de query que deben invalidarse.
 * Se prioriza `data.type`; si no se reconoce, se infiere desde `data.url`.
 * Sin coincidencia, no se invalida nada (evita refetchs innecesarios).
 */
export function getInvalidationKeys(message: PushMessage | null | undefined): readonly unknown[][] {
  if (!message || message.type !== PUSH_MESSAGE_TYPE) return []

  const data = message.data
  if (!data) return []

  const byType = typeof data.type === 'string' ? BY_TYPE[data.type] : undefined
  if (byType) return byType.map((key) => [...key])

  if (typeof data.url === 'string') {
    const match = BY_URL.find(({ prefix }) => data.url!.startsWith(prefix))
    if (match) return match.keys.map((key) => [...key])
  }

  return []
}
