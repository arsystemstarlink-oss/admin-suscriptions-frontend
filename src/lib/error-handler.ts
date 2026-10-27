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
  SLUG_TAKEN: {
    type: 'field-error',
    field: 'slug',
    message: 'Ya existe una organización con ese slug.',
  },
  PASSWORD_CHANGE_REQUIRED: {
    type: 'toast',
    variant: 'warning',
    message: 'Debes cambiar tu contraseña inicial antes de continuar.',
  },
  INVITE_NOT_FOUND: {
    type: 'toast',
    variant: 'error',
    message: 'La invitación no existe o ya no es válida.',
  },
  INVITE_EXPIRED: {
    type: 'toast',
    variant: 'warning',
    message: 'La invitación expiró. Solicita una nueva al administrador.',
  },
  INVITE_ALREADY_USED: {
    type: 'toast',
    variant: 'warning',
    message: 'Esta invitación ya fue utilizada. Inicia sesión con tu contraseña.',
  },
  ADMIN_LIMIT_REACHED: {
    type: 'toast',
    variant: 'warning',
    message: 'La organización alcanzó el máximo de administradores de su plan.',
  },
  ADMIN_LIMIT_BELOW_USAGE: {
    type: 'toast',
    variant: 'warning',
    message: 'No se puede cambiar a ese plan porque supera su límite de administradores.',
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
  INVALID_DNI: {
    type: 'field-error',
    field: 'dni',
    message: 'Cédula inválida. Use formato V-12345678 o J-123456789 (7-9 dígitos).',
  },
  DNI_TAKEN: {
    type: 'field-error',
    field: 'dni',
    message: 'Ya existe un cliente registrado con esa cédula de identidad.',
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
  FORBIDDEN: {
    type: 'toast',
    variant: 'error',
    message: 'No tienes permisos para realizar esta acción.',
  },
  INVALID_DATA: {
    type: 'toast',
    variant: 'error',
    message: 'Los datos enviados no son válidos.',
  },
  TENANT_REQUIRED: {
    type: 'toast',
    variant: 'error',
    message: 'Se requiere una organización para realizar esta acción.',
  },
  ORGANIZATION_NOT_FOUND: {
    type: 'field-error',
    field: 'organizationId',
    message: 'La organización indicada no existe o está inactiva.',
  },
  FORBIDDEN_CROSS_TENANT: {
    type: 'toast',
    variant: 'error',
    message: 'No tienes acceso a este recurso. Pertenece a otra organización.',
  },
  CROSS_TENANT_REFERENCE: {
    type: 'toast',
    variant: 'error',
    message: 'La referencia indicada pertenece a otra organización.',
  },
  LAST_ADMIN: {
    type: 'toast',
    variant: 'error',
    message: 'No se puede eliminar el único administrador.',
  },
  CANNOT_DELETE_SELF: {
    type: 'toast',
    variant: 'error',
    message: 'No puedes eliminar tu propio usuario.',
  },
  WHATSAPP_NOT_CONFIGURED: {
    type: 'toast',
    variant: 'error',
    message: 'WhatsApp (Twilio) no está configurado para esta organización.',
  },
  ORGANIZATION_INACTIVE: {
    type: 'toast',
    variant: 'error',
    message: 'La organización está inactiva y no puede operar WhatsApp.',
  },
  JOB_ALREADY_RUNNING: {
    type: 'toast',
    variant: 'warning',
    message: 'El Daily Job ya está en ejecución para esta organización.',
  },
  RATE_LIMITED: {
    type: 'toast',
    variant: 'warning',
    message: 'Demasiados intentos. Espera unos minutos y vuelve a intentarlo.',
  },
  INVALID_CRON: {
    type: 'field-error',
    field: 'cronSchedule',
    message: 'La expresión cron no es válida.',
  },
  INVALID_DATE_FORMAT: {
    type: 'toast',
    variant: 'error',
    message: 'El formato de fecha no es válido.',
  },
  INVALID_PRICE: {
    type: 'field-error',
    field: 'price',
    message: 'El precio no es válido.',
  },
  INVALID_PAYMENT_METHOD: {
    type: 'field-error',
    field: 'paymentMethod',
    message: 'El método de pago no es válido.',
  },
  PLAN_INACTIVE: {
    type: 'toast',
    variant: 'error',
    message: 'El plan está inactivo.',
  },
  SUBSCRIPTION_SUSPENDED: {
    type: 'toast',
    variant: 'error',
    message: 'La suscripción está suspendida.',
  },
  PERIOD_NOT_COMPLETE: {
    type: 'toast',
    variant: 'error',
    message: 'El período no está completo.',
  },
  INVALID_SUBSCRIPTION: {
    type: 'toast',
    variant: 'error',
    message: 'Datos de suscripción no válidos.',
  },
  INVALID_BILLING_PERIOD: {
    type: 'toast',
    variant: 'error',
    message: 'Datos del período de facturación no válidos.',
  },
  TWILIO_ERROR: {
    type: 'toast',
    variant: 'error',
    message: 'Error de Twilio al enviar el mensaje de WhatsApp.',
  },
  PAYMENT_REPORT_NOT_FOUND: {
    type: 'toast',
    variant: 'error',
    message: 'Reporte no encontrado.',
    sideEffect: 'invalidate-billing',
  },
  PAYMENT_REPORT_ALREADY_EXISTS: {
    type: 'toast',
    variant: 'warning',
    message: 'Este período ya tiene un reporte en verificación.',
    sideEffect: 'invalidate-billing',
  },
  PAYMENT_REPORT_ALREADY_REVIEWED: {
    type: 'toast',
    variant: 'warning',
    message: 'Este reporte ya fue revisado por otro administrador.',
    sideEffect: 'invalidate-billing',
  },
  PAYMENT_REPORT_INVALID_STATE: {
    type: 'toast',
    variant: 'error',
    message: 'El reporte no puede procesarse en su estado actual.',
    sideEffect: 'invalidate-billing',
  },
  PLAN_READ_ONLY: {
    type: 'toast',
    variant: 'warning',
    message: 'Tu plan venció o está suspendido. Puedes consultar tus datos, pero no cambiarlos.',
  },
  PLAN_DOWNGRADE_NOT_ALLOWED: {
    type: 'toast',
    variant: 'warning',
    message: 'No puedes bajar de plan mientras la suscripción esté vigente. Renueva o espera al vencimiento.',
  },
  INVALID_PLAN_MONTHS: {
    type: 'toast',
    variant: 'warning',
    message: 'Los meses a renovar deben ser un entero entre 1 y 12.',
  },
  INVALID_CLIENT_LIMIT: {
    type: 'field-error',
    field: 'clientLimit',
    message: 'El límite de clientes no es válido para el plan seleccionado.',
  },
  INVALID_PLAN_STATUS: {
    type: 'field-error',
    field: 'planStatus',
    message: 'El estado del plan no es válido para la configuración indicada.',
  },
  INVALID_PLAN_DATE: {
    type: 'field-error',
    field: 'planExpiresAt',
    message: 'La fecha del plan no es válida o no es futura.',
  },
  PLAN_NOT_CONFIGURED: {
    type: 'toast',
    variant: 'warning',
    message: 'El plan de la organización aún no está configurado. Contacta al super-admin.',
  },
  CLIENT_LIMIT_BELOW_USAGE: {
    type: 'toast',
    variant: 'warning',
    message: 'El límite del plan no puede ser menor que la cantidad actual de clientes.',
  },
  SUBSCRIPTION_HAS_OVERDUE_PERIODS: {
    type: 'toast',
    variant: 'warning',
    message: 'No puedes activar la suscripción mientras tenga períodos vencidos suficientes para suspenderla.',
    sideEffect: 'invalidate-subscriptions',
  },
  SUBSCRIPTION_HAS_OPEN_PERIODS: {
    type: 'toast',
    variant: 'warning',
    message: 'No puedes cambiar el plan o el día de corte mientras existan períodos pendientes o vencidos.',
    sideEffect: 'invalidate-subscriptions',
  },
  INVALID_HISTORICAL_PAYMENT_PERIOD: {
    type: 'toast',
    variant: 'error',
    message: 'Uno de los pagos históricos no coincide con un período del ciclo de facturación.',
  },
  INVALID_MAX_OVERDUE_PERIODS: {
    type: 'field-error',
    field: 'maxOverduePeriods',
    message: 'El máximo de períodos vencidos debe ser un entero entre 1 y 3.',
  },
  INVALID_QUERY: {
    type: 'toast',
    variant: 'error',
    message: 'La consulta no es válida.',
  },
  INVALID_WEBHOOK: {
    type: 'toast',
    variant: 'error',
    message: 'La firma del webhook no es válida.',
  },
  PLAN_CONCURRENT_UPDATE: {
    type: 'toast',
    variant: 'warning',
    message: 'Otra persona actualizó el plan al mismo tiempo. Recarga e inténtalo de nuevo.',
  },
  PREPAID_LIMIT_REACHED: {
    type: 'toast',
    variant: 'warning',
    message: 'El pago supera el máximo de meses prepagados permitido.',
  },
  INVALID_FILTER: {
    type: 'toast',
    variant: 'error',
    message: 'El filtro solicitado no es válido.',
  },
  TWILIO_NUMBER_IN_USE: {
    type: 'field-error',
    field: 'twilioPhoneNumber',
    message: 'Ese número de WhatsApp ya está en uso por otra organización.',
  },
  TWILIO_NUMBER_AMBIGUOUS: {
    type: 'field-error',
    field: 'twilioPhoneNumber',
    message: 'Ese número coincide con más de una organización. Contacta al soporte.',
  },
  INVALID_TWILIO_CONFIG: {
    type: 'toast',
    variant: 'error',
    message: 'Completa Account SID, Auth Token y número de WhatsApp para habilitar WhatsApp.',
  },
  INVALID_PAYLOAD: {
    type: 'toast',
    variant: 'error',
    message: 'Los datos enviados no son válidos.',
  },
  INVALID_SUBSCRIPTION_CLIENT: {
    type: 'toast',
    variant: 'error',
    message: 'El cliente de la suscripción no es válido.',
  },
  INVALID_SUBSCRIPTION_PLAN: {
    type: 'toast',
    variant: 'error',
    message: 'El plan de la suscripción no es válido.',
  },
  INVALID_SUBSCRIPTION_BILLING_DAY: {
    type: 'field-error',
    field: 'billingDay',
    message: 'El día de corte debe ser un número entre 1 y 28.',
  },
  INVALID_SUBSCRIPTION_STATUS: {
    type: 'toast',
    variant: 'error',
    message: 'El estado de la suscripción no es válido.',
  },
  INVALID_BILLING_PERIOD_SUBSCRIPTION: {
    type: 'toast',
    variant: 'error',
    message: 'El período no pertenece a una suscripción válida.',
  },
  INVALID_BILLING_PERIOD_STATUS: {
    type: 'toast',
    variant: 'error',
    message: 'El estado del período no es válido.',
  },
  INVALID_BILLING_PERIOD_AMOUNT: {
    type: 'field-error',
    field: 'amount',
    message: 'El monto del período no es válido.',
  },
  PLAN_PAYMENT_REPORT_ALREADY_EXISTS: {
    type: 'toast',
    variant: 'warning',
    message: 'Ya tienes un pago de plan en verificación.',
  },
  PLAN_PAYMENT_REPORT_NOT_FOUND: {
    type: 'toast',
    variant: 'warning',
    message: 'No encontramos el reporte de plan.',
  },
  PLAN_PAYMENT_REPORT_ALREADY_REVIEWED: {
    type: 'toast',
    variant: 'warning',
    message: 'Ese reporte de plan ya fue revisado.',
  },
  CLIENT_LIMIT_REACHED: {
    type: 'toast',
    variant: 'warning',
    message: 'Llegaste al límite de clientes de tu plan. Elige un plan con más espacio para añadir otro.',
  },
  HAS_UNPAID_PERIODS: {
    type: 'toast',
    variant: 'warning',
    message: 'Tiene períodos pendientes: cóbrelos primero antes del adelanto.',
    sideEffect: 'invalidate-billing',
  },
  PERIOD_ALREADY_EXISTS: {
    type: 'toast',
    variant: 'warning',
    message: 'El siguiente ciclo ya existe.',
    sideEffect: 'invalidate-billing',
  },
  NO_PERIODS: {
    type: 'toast',
    variant: 'error',
    message: 'La suscripción no tiene períodos registrados.',
  },
  CAPTCHA_REQUIRED: {
    type: 'toast',
    variant: 'warning',
    message: 'Completa la verificación de seguridad e intenta de nuevo.',
  },
  CAPTCHA_FAILED: {
    type: 'toast',
    variant: 'error',
    message: 'La verificación de seguridad falló. Recarga la página e intenta de nuevo.',
  },
  CAPTCHA_UNAVAILABLE: {
    type: 'toast',
    variant: 'error',
    message: 'No se pudo verificar la seguridad en este momento. Intenta de nuevo.',
  },
}

export function getErrorHandler(code: ErrorCode): ErrorHandler {
  if (BUSINESS_ERROR_HANDLERS[code]) return BUSINESS_ERROR_HANDLERS[code]
  if (code.startsWith('INVALID_SUBSCRIPTION')) return BUSINESS_ERROR_HANDLERS.INVALID_SUBSCRIPTION
  if (code.startsWith('INVALID_BILLING_PERIOD')) return BUSINESS_ERROR_HANDLERS.INVALID_BILLING_PERIOD
  return BUSINESS_ERROR_HANDLERS.INTERNAL_ERROR
}

export function handleApiError(
  error: unknown,
  options: {
    setFieldError?: (message: string) => void
    showToast?: boolean
    fallbackMessage?: string
  } = {}
): void {
  const apiError = error as {
    code?: string
    message?: string
    twilioCode?: number
    moreInfo?: string
  }
  
  if (!apiError.code) {
    if (options.showToast !== false) {
      toast.error(apiError.message || options.fallbackMessage || 'Error desconocido')
    }
    return
  }

  const handler = getErrorHandler(apiError.code as ErrorCode)
  let message = apiError.message || handler.message

  if (apiError.code === 'TWILIO_ERROR') {
    const parts = [message]
    if (apiError.twilioCode) parts.push(`Código Twilio: ${apiError.twilioCode}`)
    if (apiError.moreInfo) parts.push(apiError.moreInfo)
    message = parts.join(' · ')
  }

  if (handler.type === 'field-error' && options.setFieldError) {
    options.setFieldError(message)
  } else if (handler.type === 'toast' && options.showToast !== false) {
    toast[handler.variant || 'error'](message)
  }
}
