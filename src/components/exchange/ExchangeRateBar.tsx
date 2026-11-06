import { useDolarRates } from '@/hooks/useExchange';
import { useExchangeStore } from '@/stores/exchange.store';
import { formatRate, formatRateUpdatedAt, formatRateUpdatedAtShort } from '@/lib/exchange';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';

interface ExchangeRateBarProps {
  className?: string;
}

/**
 * Barra móvil con las dos tasas (paralelo + oficial BCV).
 * Tocar una elige cuál se usa en las conversiones a Bs.
 */
export function ExchangeRateBar({ className }: ExchangeRateBarProps) {
  const source = useExchangeStore((s) => s.source);
  const setSource = useExchangeStore((s) => s.setSource);
  const { data, isLoading, isError, refetch, isFetching } = useDolarRates();

  if (isLoading && !data) {
    return (
      <div
        role="status"
        className={cn(
          'flex h-10 items-center justify-center border-b border-border-subtle bg-surface-muted text-xs font-medium text-muted-foreground',
          className,
        )}
      >
        <span className="mr-1.5 h-2.5 w-2.5 animate-spin rounded-full border-2 border-muted border-t-primary" />
        Cargando tasa...
      </div>
    );
  }

  if ((isError || (!data?.paralelo && !data?.oficial)) && !data) {
    return (
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className={cn(
          'flex h-10 w-full items-center justify-center gap-1.5 border-b border-border-subtle bg-surface-muted text-xs font-medium text-muted-foreground',
          className,
        )}
      >
        <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        Tasa no disponible — toca para reintentar
      </button>
    );
  }

  const items = [
    { key: 'paralelo', label: 'Paralelo', value: data?.paralelo != null ? formatRate(data.paralelo) : 'N/D' },
    { key: 'oficial', label: 'BCV', value: data?.oficial != null ? formatRate(data.oficial) : 'N/D' },
  ] as const;

  const updatedLabel = formatRateUpdatedAt(data?.updatedAt);
  const updatedShortLabel = formatRateUpdatedAtShort(data?.updatedAt);

  return (
    <div
      role="group"
      aria-label="Tasa del dólar usada en las conversiones a bolívares"
      className={cn(
        'flex h-10 items-center gap-1 border-b border-border-subtle bg-surface-muted px-2',
        className,
      )}
    >
      {items.map((item) => {
        const isActive = source === item.key;
        return (
          <button
            key={item.key}
            type="button"
            onClick={() => setSource(item.key)}
            aria-pressed={isActive}
            aria-label={`Usar dólar ${item.label}: Bs ${item.value}`}
            className={cn(
              'flex h-8 min-w-0 flex-1 items-center justify-center gap-1 rounded-md px-1 text-xs tabular-nums transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              isActive
                ? 'border border-border bg-surface font-bold text-surface-foreground shadow-sm'
                : 'font-medium text-muted-foreground hover:bg-surface-hover',
            )}
          >
            <span className="shrink-0">{item.label}</span>
            <span className="truncate">{item.value}</span>
          </button>
        );
      })}
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        title={updatedLabel ? `Actualizado: ${updatedLabel}` : 'Actualizar tasa'}
        aria-label={updatedLabel ? `Actualizar tasa. Última actualización: ${updatedLabel}` : 'Actualizar tasa'}
        className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground transition-colors hover:bg-surface-hover touch-manipulation disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <RefreshCw className={cn('h-3 w-3 shrink-0', isFetching && 'animate-spin')} />
        {updatedShortLabel && <span className="whitespace-nowrap">{updatedShortLabel}</span>}
      </button>
    </div>
  );
}
