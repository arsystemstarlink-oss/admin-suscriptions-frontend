export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
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
    conversations: ['whatsapp', 'conversations'] as const,
  },
  admins: {
    lists: ['admins', 'list'] as const,
    detail: (id: string) => ['admins', id, 'detail'] as const,
  },
  organizations: {
    lists: ['organizations', 'list'] as const,
    detail: (id: string) => ['organizations', id, 'detail'] as const,
  },
} as const
