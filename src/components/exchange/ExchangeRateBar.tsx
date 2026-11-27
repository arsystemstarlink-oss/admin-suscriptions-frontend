import { useDolarRates } from '@/hooks/useExchange';
import { useExchangeStore } from '@/stores/exchange.store';
import { formatRate, formatRateUpdatedAt } from '@/lib/exchange';
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
          'flex h-11 items-center justify-center border-b border-border-subtle bg-surface-muted text-sm font-medium text-muted-foreground',
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
          'flex h-11 w-full items-center justify-center gap-1.5 border-b border-border-subtle bg-surface-muted text-sm font-medium text-muted-foreground',
          className,
        )}
      >
        <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
        Sin tasa · Reintentar
      </button>
    );
  }

  const items = [
    {
      key: 'paralelo',
      label: 'Paralelo',
      icon: TrendingUp,
      value: data?.paralelo != null ? formatRate(data.paralelo) : 'N/D',
    },
    {
      key: 'oficial',
      label: 'BCV',
      icon: Landmark,
      value: data?.oficial != null ? formatRate(data.oficial) : 'N/D',
    },
  ] as const;

  const updatedLabel = formatRateUpdatedAt(data?.updatedAt);

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
          const RateIcon = item.icon;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSource(item.key)}
              aria-pressed={isActive}
              aria-label={`Usar dólar ${item.label}: ${item.value} Bs`}
              className={cn(
                'relative z-10 flex h-10 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 tabular-nums transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive ? 'text-primary-foreground' : 'text-muted-foreground',
              )}
            >
              <RateIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
              <span className="flex min-w-0 items-baseline gap-1 tabular-nums">
                <span
                  className={cn(
                    'min-w-0 truncate text-base font-bold leading-none',
                    isActive ? 'text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {item.value}
                </span>
                <span
                  className={cn(
                    'shrink-0 text-xs font-medium',
                    isActive ? 'text-primary-foreground' : 'text-muted-foreground',
                  )}
                >
                  Bs
                </span>
              </span>
              <span className="sr-only">{item.label}</span>
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
          className="flex h-10 min-w-11 items-center justify-center rounded-lg px-1 text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground touch-manipulation disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <RefreshCw className={cn('h-4 w-4 shrink-0', isFetching && 'animate-spin')} />
        </button>
      </div>
    </div>
  );
}
