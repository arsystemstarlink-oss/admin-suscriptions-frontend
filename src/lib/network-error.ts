import axios from 'axios'

const READ_MESSAGE = 'Sin conexión. Revisa tu red e inténtalo de nuevo.'
const WRITE_MESSAGE = 'Sin conexión. La acción no se completó; inténtalo cuando vuelvas a tener red.'

/** La petición no obtuvo respuesta del servidor: sin red, servidor caído o tiempo agotado. */
export function isNetworkError(error: unknown): boolean {
  return axios.isAxiosError(error) && !error.response && !axios.isCancel(error)
}

export function networkErrorMessage(method?: string): string {
  return !method || method.toLowerCase() === 'get' ? READ_MESSAGE : WRITE_MESSAGE
}

/**
 * Sustituye el "Network Error" de axios por un texto para el usuario, de modo que
 * cualquier `error.message` mostrado en pantalla ya salga en español.
 */
export function localizeNetworkError(error: unknown): void {
  if (!isNetworkError(error)) return
  const axiosError = error as { message: string; config?: { method?: string } }
  axiosError.message = networkErrorMessage(axiosError.config?.method)
}
