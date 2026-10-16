/**
 * Configuración del CAPTCHA (Cloudflare Turnstile) del portal público.
 * Si `VITE_TURNSTILE_SITE_KEY` está vacía, el CAPTCHA se omite (útil en dev).
 */
export const TURNSTILE_SITE_KEY =
  (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined)?.trim() ?? ''

export const isCaptchaEnabled = TURNSTILE_SITE_KEY.length > 0
