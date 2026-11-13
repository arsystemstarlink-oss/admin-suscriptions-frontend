export function getNavigationStatePath(
  state: unknown,
  key: 'from' | 'returnTo',
): string | undefined {
  if (!state || typeof state !== 'object') return undefined

  const path = (state as Record<string, unknown>)[key]
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
    ? path
    : undefined
}

/** Datos que la lista ya tiene de un elemento, para pintar su detalle antes de que cargue. */
export interface NavigationPreview {
  title: string
  subtitle?: string
}

export function getNavigationPreview(state: unknown): NavigationPreview | undefined {
  if (!state || typeof state !== 'object') return undefined

  const preview = (state as Record<string, unknown>).preview
  if (!preview || typeof preview !== 'object') return undefined

  const { title, subtitle } = preview as Record<string, unknown>
  if (typeof title !== 'string' || !title) return undefined
  return { title, subtitle: typeof subtitle === 'string' ? subtitle : undefined }
}

export function getNavigationBackLabel(path: string, fallback: string): string {
  const pathname = path.split(/[?#]/, 1)[0]

  if (pathname === '/dashboard') return 'Volver al inicio'
  if (pathname === '/subscriptions') return 'Volver a suscripciones'
  if (pathname === '/subscriptions/clients') return 'Volver a clientes'
  if (pathname.startsWith('/subscriptions/clients/')) {
    return 'Volver al cliente'
  }
  if (pathname === '/subscriptions/plans' || pathname.startsWith('/subscriptions/plans/')) {
    return 'Volver a planes'
  }
  if (/^\/subscriptions\/[^/]+$/.test(pathname)) {
    return 'Volver a la suscripción'
  }
  if (pathname === '/config' || pathname.startsWith('/config/')) {
    return 'Volver a ajustes'
  }

  return fallback
}
