import { useDolarRates } from '@/hooks/useExchange';
import { useExchangeStore } from '@/stores/exchange.store';
import { formatRate, formatRateUpdatedAt, formatRateUpdatedAtShort } from '@/lib/exchange';
import { cn } from '@/lib/utils';
import { Landmark, RefreshCw, TrendingUp } from 'lucide-react';

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
          'flex h-11 items-center justify-center border-b border-border-subtle bg-surface-muted text-xs font-medium text-muted-foreground',
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
          'flex h-11 w-full items-center justify-center gap-1.5 border-b border-border-subtle bg-surface-muted text-xs font-medium text-muted-foreground',
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
        'flex h-11 items-center gap-1.5 border-b border-border-subtle bg-surface-muted px-2',
        className,
      )}
    >
      <div className="relative flex h-10 min-w-0 flex-1 rounded-lg bg-surface-active">
        <span
          aria-hidden="true"
          className={cn(
            'absolute inset-y-0 left-0 w-1/2 rounded-lg border border-primary bg-primary shadow-sm transition-transform duration-300 ease-out',
            source === 'oficial' && 'translate-x-full',
          )}
        >
          <span className="absolute bottom-1 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-exchange-accent" />
        </span>
        {items.map((item) => {
          const isActive = source === item.key;
          const RateIcon = item.key === 'oficial' ? Landmark : TrendingUp;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSource(item.key)}
              aria-pressed={isActive}
              aria-label={`Usar dólar ${item.label}: Bs ${item.value}`}
              className={cn(
                'relative z-10 flex h-10 min-w-0 flex-1 flex-col items-start justify-center gap-0 rounded-lg px-2.5 text-left tabular-nums transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              <span className="flex items-center gap-1 text-xs font-medium leading-tight">
                <RateIcon aria-hidden="true" className="h-3 w-3 shrink-0" />
                {item.label}
              </span>
              <span
                className={cn(
                  'w-full truncate text-sm font-bold leading-tight',
                  isActive ? 'text-primary-foreground' : 'text-foreground',
                )}
              >
                {item.value}
              </span>
            </button>
          );
        })}
      </div>
      <div className="flex h-10 shrink-0 items-center border-l border-border-subtle pl-1.5">
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          title={updatedLabel ? `Actualizado: ${updatedLabel}` : 'Actualizar tasa'}
          aria-label={updatedLabel ? `Actualizar tasa. Última actualización: ${updatedLabel}` : 'Actualizar tasa'}
          className="flex h-10 min-w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-xs text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground touch-manipulation disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className={cn('h-3 w-3 shrink-0', isFetching && 'animate-spin')} />
          {updatedShortLabel && <span className="whitespace-nowrap leading-tight">{updatedShortLabel}</span>}
        </button>
      </div>
    </div>
  );
}
