export const qk = {
  auth: {
    me: ['auth', 'me'] as const,
  },
  dashboard: {
    summary: ['dashboard', 'summary'] as const,
    alerts: ['dashboard', 'alerts'] as const,
  },
  clients: {
    all: ['clients'] as const,
    lists: ['clients', 'list'] as const,
    detail: (id: string, organizationId?: string) =>
      organizationId ? ['clients', id, 'detail', organizationId] as const : ['clients', id, 'detail'] as const,
  },
  plans: {
    lists: ['plans', 'list'] as const,
    detail: (id: string) => ['plans', id] as const,
  },
  subscriptions: {
    all: ['subscriptions'] as const,
    lists: ['subscriptions', 'list'] as const,
    detail: (id: string) => ['subscriptions', id, 'detail'] as const,
  },
  billing: {
    all: ['billing-periods'] as const,
    lists: ['billing-periods', 'list'] as const,
    detail: (id: string) => ['billing-periods', id] as const,
  },
  scheduler: {
    config: ['scheduler', 'config'] as const,
    logs: ['scheduler', 'logs'] as const,
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
    whatsappConfig: (id: string) => ['organizations', id, 'whatsapp-config'] as const,
  },
  paymentReports: {
    lists: ['payment-reports', 'list'] as const,
    detail: (id: string) => ['payment-reports', id, 'detail'] as const,
  },
  businessPlans: ['business-plans'] as const,
  publicPaymentInstructions: ['public', 'payment-instructions'] as const,
  planQuoteRequests: {
    lists: ['plan-quote-requests', 'list'] as const,
  },
  organizationPlanPaymentReports: {
    mine: ['organization-plan-payment-reports', 'mine'] as const,
    lists: ['organization-plan-payment-reports', 'list'] as const,
    quote: (organizationId: string, plan: string, paidAt: string) =>
      ['organization-plan-payment-reports', 'quote', organizationId, plan, paidAt] as const,
  },
  badges: ['badges'] as const,
} as const
