import type { ErrorCode } from '@/types/api'
import { toast } from 'sonner'

export class BusinessError extends Error {
  code: ErrorCode

  constructor(code: ErrorCode, message: string) {
    super(message)
    this.code = code
    this.name = 'BusinessError'
  }
}

export type ErrorAction = {
  label: string
  variant: 'primary' | 'ghost' | 'destructive'
  action: 'navigate' | 'close' | 'invalidate'
  payload?: string
}

export type ErrorHandler = {
  type: 'modal' | 'toast' | 'field-error'
  title?: string
  message: string
  field?: string
  variant?: 'success' | 'warning' | 'error' | 'info'
  actions?: ErrorAction[]
  sideEffect?: 'invalidate-billing' | 'invalidate-clients' | 'invalidate-subscriptions'
}

export const BUSINESS_ERROR_HANDLERS: Record<ErrorCode, ErrorHandler> = {
  CLIENT_HAS_ACTIVE_SUBSCRIPTIONS: {
    type: 'modal',
    title: 'No se puede eliminar este cliente',
    message: 'Tiene suscripciones activas que deben suspenderse o eliminarse primero.',
    actions: [
      { label: 'Ver suscripciones del cliente', variant: 'primary', action: 'navigate', payload: '/clients' },
      { label: 'Cancelar', variant: 'ghost', action: 'close' },
    ],
  },
  PLAN_HAS_SUBSCRIPTIONS: {
    type: 'modal',
    title: 'No se puede eliminar este plan',
    message: 'Tiene suscripciones asociadas. Reasígnelas a otro plan primero.',
    actions: [
      { label: 'Ver suscripciones de este plan', variant: 'primary', action: 'navigate', payload: '/subscriptions' },
      { label: 'Cancelar', variant: 'ghost', action: 'close' },
    ],
  },
  PERIOD_ALREADY_PAID: {
    type: 'toast',
    variant: 'warning',
    message: 'Este período ya fue pagado previamente.',
    sideEffect: 'invalidate-billing',
  },
  INVALID_PAYMENT_AMOUNT: {
    type: 'field-error',
    field: 'amount',
    message: 'El monto no coincide con el monto del período.',
  },
  INVALID_BILLING_DAY: {
    type: 'field-error',
    field: 'billingDay',
    message: 'El día de corte debe ser un número entre 1 y 28.',
  },
  INVALID_PERIOD_STATE: {
    type: 'toast',
    variant: 'error',
    message: 'Este período no permite registrar pagos en su estado actual.',
    sideEffect: 'invalidate-billing',
  },
  INVALID_CREDENTIALS: {
    type: 'field-error',
    field: 'general',
    message: 'Correo o contraseña incorrectos.',
  },
  UNAUTHORIZED: {
    type: 'toast',
    variant: 'error',
    message: 'Sesión expirada, inicie sesión nuevamente.',
  },
  REFRESH_TOKEN_REVOKED: {
    type: 'toast',
    variant: 'error',
    message: 'Sesión expirada, inicie sesión nuevamente.',
  },
  USER_NOT_FOUND: {
    type: 'toast',
    variant: 'error',
    message: 'Usuario no encontrado. Su sesión podría estar expirada.',
  },
  EMAIL_TAKEN: {
    type: 'field-error',
    field: 'email',
    message: 'Este correo ya está en uso.',
  },
  INVALID_EMAIL: {
    type: 'field-error',
    field: 'email',
    message: 'El correo no es válido.',
  },
  INVALID_PHONE: {
    type: 'field-error',
    field: 'phone',
    message: 'El teléfono no es válido. Use formato +58 seguido de 10 u 11 dígitos.',
  },
  INVALID_PASSWORD: {
    type: 'field-error',
    field: 'currentPassword',
    message: 'La contraseña actual no es correcta.',
  },
  WEAK_PASSWORD: {
    type: 'field-error',
    field: 'newPassword',
    message: 'La contraseña debe tener al menos 8 caracteres e incluir letras y números.',
  },
  SETUP_DISABLED: {
    type: 'toast',
    variant: 'error',
    message: 'La configuración inicial no está habilitada.',
  },
  INVALID_SETUP_KEY: {
    type: 'field-error',
    field: 'setupKey',
    message: 'La clave de configuración inicial no es válida.',
  },
  CLIENT_NOT_FOUND: {
    type: 'toast',
    variant: 'error',
    message: 'Cliente no encontrado.',
    sideEffect: 'invalidate-clients',
  },
  PLAN_NOT_FOUND: {
    type: 'toast',
    variant: 'error',
    message: 'Plan no encontrado.',
  },
  INVALID_CLIENT: {
    type: 'field-error',
    field: 'clientId',
    message: 'Seleccione un cliente válido.',
  },
  INVALID_PLAN: {
    type: 'field-error',
    field: 'planId',
    message: 'Seleccione un plan activo.',
  },
  NOT_FOUND: {
    type: 'toast',
    variant: 'error',
    message: 'Recurso no encontrado.',
  },
  INTERNAL_ERROR: {
    type: 'toast',
    variant: 'error',
    message: 'Error interno del servidor',
  },
  INVALID_ACTIVATION_DATE: {
    type: 'toast',
    variant: 'error',
    message: 'La fecha de activación no es válida',
  },
  INVALID_HISTORICAL_PAYMENTS: {
    type: 'toast',
    variant: 'error',
    message: 'Los pagos históricos no son válidos',
  },
  INVALID_PAYMENT_DATE: {
    type: 'toast',
    variant: 'error',
    message: 'La fecha de pago no es válida',
  },
  INVALID_PERIOD_START: {
    type: 'toast',
    variant: 'error',
    message: 'La fecha de inicio del período no es válida',
  },
  INVALID_PERIOD_RANGE: {
    type: 'toast',
    variant: 'error',
    message: 'El rango del período no es válido',
  },
  INVALID_AMOUNT: {
    type: 'toast',
    variant: 'error',
    message: 'El monto no es válido',
  },
  OVERLAPPING_PERIODS: {
    type: 'toast',
    variant: 'error',
    message: 'Los períodos se superponen',
  },
  VAPID_NOT_CONFIGURED: {
    type: 'toast',
    variant: 'error',
    message: 'Las notificaciones push no están configuradas en el servidor.',
  },
  PUSH_SUBSCRIPTION_NOT_FOUND: {
    type: 'toast',
    variant: 'warning',
    message: 'La suscripción push no existe en el servidor.',
  },
}

export function getErrorHandler(code: ErrorCode): ErrorHandler {
  return BUSINESS_ERROR_HANDLERS[code] || BUSINESS_ERROR_HANDLERS.INTERNAL_ERROR
}

export function handleApiError(
  error: unknown,
  options: {
    setFieldError?: (message: string) => void
    showToast?: boolean
    fallbackMessage?: string
  } = {}
): void {
  const apiError = error as { code?: string; message?: string }
  
  if (!apiError.code) {
    if (options.showToast !== false) {
      toast.error(apiError.message || options.fallbackMessage || 'Error desconocido')
    }
    return
  }

  const handler = getErrorHandler(apiError.code as ErrorCode)

  if (handler.type === 'field-error' && options.setFieldError) {
    options.setFieldError(handler.message)
  } else if (handler.type === 'toast' && options.showToast !== false) {
    toast[handler.variant || 'error'](handler.message)
  }
}
