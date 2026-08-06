export const qk = {
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    alerts: ['dashboard', 'alerts'] as const,
  },
  clients: {
    lists: ['clients', 'list'] as const,
    detail: (id: string) => ['clients', id, 'detail'] as const,
  },
  plans: {
    lists: ['plans', 'list'] as const,
    detail: (id: string) => ['plans', id] as const,
  },
  subscriptions: {
    lists: ['subscriptions', 'list'] as const,
    detail: (id: string) => ['subscriptions', id, 'detail'] as const,
  },
  billing: {
    lists: ['billing-periods', 'list'] as const,
    detail: (id: string) => ['billing-periods', id] as const,
  },
  scheduler: {
    config: ['scheduler', 'config'] as const,
  },
  whatsapp: {
    messages: (phone: string) => ['whatsapp', 'messages', phone] as const,
  },
} as const
