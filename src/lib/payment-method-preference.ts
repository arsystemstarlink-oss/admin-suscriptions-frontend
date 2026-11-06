import { PAYMENT_METHOD_OPTIONS } from '@/lib/constants'

const LAST_PAYMENT_METHOD_KEY = 'payment.lastMethod'

/** Último método usado en este dispositivo, o '' si no hay uno válido. */
export function getLastPaymentMethod(): string {
  try {
    const stored = localStorage.getItem(LAST_PAYMENT_METHOD_KEY)
    return PAYMENT_METHOD_OPTIONS.some(([key]) => key === stored) ? (stored as string) : ''
  } catch {
    return ''
  }
}

export function saveLastPaymentMethod(method: string): void {
  try {
    localStorage.setItem(LAST_PAYMENT_METHOD_KEY, method)
  } catch {
    // almacenamiento no disponible: se volverá a pedir el método
  }
}
