import { useEffect } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { APP_NAME } from '@/lib/brand'

/** Mantiene el título de la pestaña según `handle.title` de la ruta activa más específica. */
export function RouteTitle() {
  const matches = useMatches()
  const title = matches
    .map((match) => (match.handle as { title?: string } | undefined)?.title)
    .filter(Boolean)
    .at(-1)

  useEffect(() => {
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
  }, [title])

  return <Outlet />
}
