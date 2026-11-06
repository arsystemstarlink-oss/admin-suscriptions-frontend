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
