export enum PaymentMethod {
  CASH = 'CASH',
  TRANSFER = 'TRANSFER',
  USDT = 'USDT',
  CARD = 'CARD',
  INITIAL_PAYMENT = 'INITIAL_PAYMENT',
  OTHER = 'OTHER',
}

export enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export enum BillingPeriodStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface User {
  id: string
  name: string
  email: string
  role: string
}

export interface Client {
  id: string
  firstName: string
  lastName: string
  phone: string
  email?: string
  address?: string
  notes?: string
  createdAt: string
}

export interface ClientWithStats extends Client {
  subscriptionStatus: 'ACTIVE' | 'SUSPENDED' | 'MIXED' | 'NONE'
  hasDebt: boolean
  overdueCount: number
  totalSubscriptions: number
}

export interface ClientWithSubscriptions extends ClientWithStats {
  subscriptions: Subscription[]
}

export interface Plan {
  id: string
  name: string
  price: number
  description?: string
  active: boolean
  createdAt: string
}

export interface Subscription {
  id: string
  clientId: string
  planId: string
  kitNumber: string
  accountNumber?: string
  billingDay: number
  status: SubscriptionStatus
  maxOverduePeriods: number
  activationDate?: string
  createdAt: string
}

export interface SchedulerConfig {
  id: string
  enabled: boolean
  cronSchedule: string
  lastRun?: string
  updatedAt: string
}

export interface UpdateSchedulerConfigRequest {
  enabled?: boolean
  cronSchedule?: string
}

export interface SubscriptionWithDetails extends Subscription {
  client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'phone' | 'email'>
  plan: Pick<Plan, 'id' | 'name' | 'price'>
  currentPeriod?: BillingPeriod
  totalPeriods: number
  overduePeriods: number
  pendingPeriods: number
  hasDebt: boolean
}

export interface SubscriptionWithPeriods extends SubscriptionWithDetails {
  plan: Plan
  billingPeriods: BillingPeriod[]
  summary: {
    totalPeriods: number
    paidPeriods: number
    pendingPeriods: number
    overduePeriods: number
    totalPaid: number
    totalPending: number
    hasDebt: boolean
  }
}

export interface BillingPeriod {
  id: string
  subscriptionId: string
  periodLabel: string
  startDate: string
  endDate: string
  amount: number
  status: BillingPeriodStatus
  paidAt?: string
  paymentMethod?: PaymentMethod
  notes?: string
  createdAt: string
}

export interface BillingPeriodWithDetails extends BillingPeriod {
  subscription: Pick<Subscription, 'id' | 'kitNumber' | 'status'>
  client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'phone' | 'email'>
  plan: Pick<Plan, 'id' | 'name' | 'price'>
}

export interface DashboardSummary {
  clients: { total: number }
  plans: { total: number; active: number }
  subscriptions: { total: number; active: number; suspended: number }
  billingPeriods: { total: number; paid: number; pending: number; overdue: number }
  financial: {
    monthlyIncome: number
    totalIncome: number
    totalPending: number
    totalOverdue: number
    totalDebt: number
  }
  generatedAt: string
}

export interface AlertItem {
  periodId: string
  periodLabel: string
  amount: number
  endDate: string
  subscriptionId: string
  kitNumber: string
  clientName: string
  clientPhone: string
}

export interface DebtorItem {
  clientId: string
  clientName: string
  clientPhone: string
  totalDebt: number
  overdueCount: number
}

export interface DashboardAlerts {
  generatedAt: string
  expiringSoon: {
    count: number
    description: string
    items: AlertItem[]
  }
  overdueDebt: {
    count: number
    description: string
    totalAmount: number
    items: AlertItem[]
  }
  suspended: {
    count: number
    description: string
  }
  topDebtors: {
    count: number
    description: string
    items: DebtorItem[]
  }
}

export interface Pagination {
  total: number
  limit: number
  offset: number
  hasMore: boolean
}

export interface PaginatedResponse<T> {
  pagination: Pagination
  [key: string]: T[] | Pagination
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  user: User
}

export interface RefreshRequest {
  refreshToken: string
}

export interface RefreshResponse {
  accessToken: string
  refreshToken: string
}

export interface CreateClientRequest {
  firstName: string
  lastName: string
  phone: string
  email?: string
  address?: string
  notes?: string
}

export interface UpdateClientRequest {
  firstName?: string
  lastName?: string
  phone?: string
  email?: string
  address?: string
  notes?: string
}

export interface CreatePlanRequest {
  name: string
  price: number
  description?: string
  active?: boolean
}

export interface UpdatePlanRequest {
  name?: string
  price?: number
  description?: string
  active?: boolean
}

export interface HistoricalPayment {
  periodLabel: string
  startDate: string
  endDate: string
  amount: number
  paidAt: string
  paymentMethod: PaymentMethod
  notes?: string
}

export interface CreateSubscriptionRequest {
  clientId: string
  planId: string
  kitNumber: string
  accountNumber?: string
  billingDay: number
  maxOverduePeriods?: number
  activationDate?: string
  historicalPayments?: HistoricalPayment[]
}

export interface UpdateSubscriptionRequest {
  planId?: string
  kitNumber?: string
  accountNumber?: string
  billingDay?: number
  status?: SubscriptionStatus
  maxOverduePeriods?: number
}

export interface PayRequest {
  paymentMethod: PaymentMethod
  amount: number
  paidAt: string
  notes?: string
}

export interface UpdateBillingPeriodRequest {
  paymentMethod?: PaymentMethod
  amount?: number
  paidAt?: string
  notes?: string
}

export interface PayResponse {
  billingPeriod: BillingPeriod
  subscription: {
    id: string
    status: SubscriptionStatus
    previousStatus: SubscriptionStatus
    reactivated: boolean
  }
}

export interface ClientDetailResponse {
  client: Client
  subscriptions: SubscriptionWithDetails[]
  summary: {
    totalSubscriptions: number
    activeSubscriptions: number
    suspendedSubscriptions: number
    totalOverdue: number
    hasDebt: boolean
  }
}

export interface SubscriptionDetailResponse {
  subscription: SubscriptionWithDetails
  billingPeriods: BillingPeriod[]
  summary: {
    totalPeriods: number
    paidPeriods: number
    pendingPeriods: number
    overduePeriods: number
    totalPaid: number
    totalPending: number
    hasDebt: boolean
  }
}

export interface CreateSubscriptionResponse {
  subscription: Subscription
  billingPeriods: BillingPeriod[]
  summary: {
    totalPeriods: number
    paidPeriods: number
    pendingPeriods: number
    overduePeriods: number
    totalPaid: number
    totalPending: number
  }
}

export interface EvaluateOverdueResponse {
  message: string
  evaluatedAt: string
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'INVALID_BILLING_DAY'
  | 'CLIENT_NOT_FOUND'
  | 'PLAN_NOT_FOUND'
  | 'INVALID_CLIENT'
  | 'INVALID_PLAN'
  | 'CLIENT_HAS_ACTIVE_SUBSCRIPTIONS'
  | 'PLAN_HAS_SUBSCRIPTIONS'
  | 'PERIOD_ALREADY_PAID'
  | 'INVALID_PAYMENT_AMOUNT'
  | 'INVALID_PERIOD_STATE'
  | 'NOT_FOUND'
  | 'INTERNAL_ERROR'
  | 'INVALID_ACTIVATION_DATE'
  | 'INVALID_HISTORICAL_PAYMENTS'
  | 'INVALID_PAYMENT_DATE'
  | 'INVALID_PERIOD_START'
  | 'INVALID_PERIOD_RANGE'
  | 'INVALID_AMOUNT'
  | 'OVERLAPPING_PERIODS'

export interface ApiError {
  code: ErrorCode
  message: string
}

export type MessageDirection = 'INBOUND' | 'OUTBOUND'
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export interface WhatsAppMessage {
  id: string
  clientId?: string
  phone: string
  direction: MessageDirection
  messageSid: string
  body: string
  templateName?: string
  status: MessageStatus
  errorMessage?: string
  profileName?: string
  createdAt: string
}

export interface SendMessageRequest {
  to: string
  body?: string
  templateName?: string
  variables?: Record<string, string>
}

export interface SendMessageResponse {
  success: boolean
  messageSid: string
  message: string
}

export interface MessagesByPhoneResponse {
  messages: WhatsAppMessage[]
  total: number
}
