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
