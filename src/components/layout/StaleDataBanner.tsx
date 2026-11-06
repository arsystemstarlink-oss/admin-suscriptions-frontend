import { useState, useSyncExternalStore } from 'react'
import { useQueryClient, type Query } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import { CloudOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

/** Consulta de la pantalla actual que no pudo refrescarse y sigue mostrando datos anteriores. */
function isShowingStaleData(query: Query): boolean {
  return query.isActive() && query.state.status === 'error' && query.state.data !== undefined
}

export function StaleDataBanner() {
  const queryClient = useQueryClient()
  const queryCache = queryClient.getQueryCache()
  const [isRetrying, setIsRetrying] = useState(false)

  // Fecha de los datos más antiguos en pantalla; 0 si todo está al día.
  const oldestUpdate = useSyncExternalStore(
    (onChange) => queryCache.subscribe(onChange),
    () =>
      queryCache
        .getAll()
        .filter(isShowingStaleData)
        .reduce(
          (oldest, query) =>
            oldest === 0 ? query.state.dataUpdatedAt : Math.min(oldest, query.state.dataUpdatedAt),
          0,
        ),
  )

  if (oldestUpdate === 0) return null

  const retry = async () => {
    setIsRetrying(true)
    try {
      await queryClient.refetchQueries({ predicate: isShowingStaleData })
    } finally {
      setIsRetrying(false)
    }
  }

  return (
    <section
      role="status"
      className="mb-4 flex flex-col gap-3 rounded-xl border border-warning/20 bg-warning/10 p-4 text-foreground sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex items-start gap-3">
        <CloudOff className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <div>
          <h2 className="font-semibold">No pudimos actualizar los datos</h2>
          <p className="text-sm text-muted-foreground">
            Lo que ves puede no estar al día. Última actualización:{' '}
            {formatDistanceToNow(oldestUpdate, { addSuffix: true, locale: es })}.
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        className="shrink-0"
        onClick={retry}
        disabled={isRetrying}
      >
        {isRetrying ? 'Reintentando…' : 'Reintentar'}
      </Button>
    </section>
  )
}
