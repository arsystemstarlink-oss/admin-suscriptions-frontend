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

export type UserRole = 'super-admin' | 'admin'

export interface OrganizationTwilioConfigRequest {
  accountSid?: string
  authToken?: string | null
  phoneNumber?: string
  enabled?: boolean
}

export interface OrganizationTwilioInfo {
  accountSid?: string
  phoneNumber?: string
  enabled?: boolean
  authTokenSet?: boolean
}

export interface Organization {
  id: string
  name: string
  slug?: string
  active: boolean
  twilio?: OrganizationTwilioInfo
  twilioConfigured?: boolean
  createdAt: string
  createdBy?: string
}

export interface OrganizationUserSummary {
  id: string
  name: string
  email: string
  role: UserRole
  createdAt: string
}

export interface OrganizationsListResponse {
  organizations: Organization[]
  pagination: Pagination
}

export interface OrganizationDetailResponse {
  organization: Organization
  users: OrganizationUserSummary[]
}

export interface CreateOrganizationRequest {
  name: string
  slug?: string
  active?: boolean
  twilio?: OrganizationTwilioConfigRequest
}

export interface UpdateOrganizationRequest {
  name?: string
  slug?: string
  active?: boolean
  twilio?: OrganizationTwilioConfigRequest | null
}

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  organizationId: string | null
  phone?: string
  createdAt: string
  lastLoginAt?: string
}

export interface Admin {
  id: string
  name: string
  email: string
  phone?: string
  role: UserRole
  organizationId: string | null
  createdAt: string
  lastLoginAt?: string
}

export interface AdminsListResponse {
  admins: Admin[]
  pagination: Pagination
}

export interface AdminDetailResponse {
  admin: Admin
}

export interface CreateAdminRequest {
  name: string
  email: string
  password: string
  phone?: string
  role?: UserRole
  organizationId?: string
}

export interface CreateAdminResponse {
  message: string
  user: User
}

export interface UpdateAdminRequest {
  name?: string
  email?: string
  phone?: string
  newPassword?: string
}

export interface UpdateAdminResponse {
  admin: Admin
  accessToken?: string
  refreshToken?: string
}

export interface Client {
  id: string
  organizationId: string
  firstName: string
  lastName: string
  phone: string
  dni?: string
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
  organizationId: string
  name: string
  price: number
  description?: string
  active: boolean
  createdAt: string
}

export interface Subscription {
  id: string
  organizationId: string
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
  client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'phone' | 'dni' | 'email'>
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
  organizationId: string
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
  client: Pick<Client, 'id' | 'firstName' | 'lastName' | 'phone' | 'dni' | 'email'>
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
  clientDni?: string
}

export interface DebtorItem {
  clientId: string
  clientName: string
  clientPhone: string
  clientDni?: string
  totalDebt: number
  overdueCount: number
}

export interface DashboardAlerts {
  generatedAt: string
  expiringSoon: {
    count: number
    items: AlertItem[]
  }
  overdue: {
    totalOverduePeriods: number
    totalOverdueAmount: number
    suspendedSubscriptions: number
  }
  topDebtors: {
    count: number
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

export interface MeResponse {
  user: User
}

export interface UpdateMeRequest {
  name?: string
  email?: string
  phone?: string
  currentPassword?: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ChangePasswordResponse {
  message: string
  accessToken: string
  refreshToken: string
}

export interface CreateAdminResponse {
  message: string
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
  organizationId?: string
  firstName: string
  lastName: string
  phone: string
  dni?: string
  email?: string
  address?: string
  notes?: string
}

export interface UpdateClientRequest {
  firstName?: string
  lastName?: string
  phone?: string
  dni?: string | null
  email?: string
  address?: string
  notes?: string
}

export interface CreatePlanRequest {
  organizationId?: string
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
  organizationId?: string
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
  subscription: SubscriptionWithDetails & { plan: Plan }
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
    hasDebt: boolean
  }
}

export interface EvaluateOverdueResponse {
  message: string
  evaluatedAt: string
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'INVALID_CREDENTIALS'
  | 'USER_NOT_FOUND'
  | 'EMAIL_TAKEN'
  | 'INVALID_EMAIL'
  | 'INVALID_PHONE'
  | 'INVALID_DNI'
  | 'DNI_TAKEN'
  | 'WEAK_PASSWORD'
  | 'INVALID_PASSWORD'
  | 'REFRESH_TOKEN_REVOKED'
  | 'SETUP_DISABLED'
  | 'INVALID_SETUP_KEY'
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
  | 'VAPID_NOT_CONFIGURED'
  | 'PUSH_SUBSCRIPTION_NOT_FOUND'
  | 'FORBIDDEN'
  | 'INVALID_DATA'
  | 'TENANT_REQUIRED'
  | 'ORGANIZATION_NOT_FOUND'
  | 'FORBIDDEN_CROSS_TENANT'
  | 'CROSS_TENANT_REFERENCE'
  | 'LAST_ADMIN'
  | 'CANNOT_DELETE_SELF'
  | 'WHATSAPP_NOT_CONFIGURED'

export interface ApiError {
  code: ErrorCode
  message: string
}

export type MessageDirection = 'INBOUND' | 'OUTBOUND'
export type MessageStatus = 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'

export interface WhatsAppMessage {
  id: string
  organizationId?: string
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

export interface WhatsAppConversation {
  phone: string
  clientId?: string
  profileName?: string
  lastMessage: WhatsAppMessage
  messageCount: number
}

export interface ConversationsResponse {
  conversations: WhatsAppConversation[]
  total: number
}

export interface PushSubscriptionInfo {
  id: string
  endpoint: string
  userAgent: string
  createdAt: string
}

export interface PushSubscriptionsListResponse {
  subscriptions: PushSubscriptionInfo[]
}

export interface RegisterPushSubscriptionResponse {
  subscription: PushSubscriptionInfo
}

export interface VapidPublicKeyResponse {
  vapidPublicKey: string
}

export interface SendTestPushResponse {
  message: string
  sent: number
}
