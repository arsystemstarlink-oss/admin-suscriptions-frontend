import { useDolarRates } from '@/hooks/useExchange';
import { useExchangeStore } from '@/stores/exchange.store';
import { formatRate, formatRateUpdatedAt } from '@/lib/exchange';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';

interface ExchangeTickerProps {
  className?: string;
}

/**
 * Cintillo móvil con las dos tasas (paralelo + oficial BCV) en movimiento continuo.
 * Tocar alterna cuál es la tasa activa para las conversiones a Bs.
 * No ocupa filas extra: es una franja fina (~24px) bajo el header.
 */
export function ExchangeTicker({ className }: ExchangeTickerProps) {
  const source = useExchangeStore((s) => s.source);
  const setSource = useExchangeStore((s) => s.setSource);
  const { data, isLoading, isError, refetch, isFetching } = useDolarRates();

  const updatedLabel = formatRateUpdatedAt(data?.updatedAt);

  if (isLoading && !data) {
    return (
      <div
        className={cn(
          'flex h-6 items-center justify-center border-b border-border-subtle bg-surface-muted text-[11px] font-medium text-muted-foreground',
          className,
        )}
        aria-label="Cargando tasa del dólar"
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
          'flex h-6 w-full items-center justify-center gap-1.5 border-b border-border-subtle bg-surface-muted text-[11px] font-medium text-muted-foreground',
          className,
        )}
      >
        <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        Tasa no disponible — toca para reintentar
      </button>
    );
  }

  const items: { key: string; label: string; value: string | null }[] = [
    {
      key: 'paralelo',
      label: 'Paralelo',
      value: data?.paralelo != null ? formatRate(data.paralelo) : null,
    },
    {
      key: 'oficial',
      label: 'BCV',
      value: data?.oficial != null ? formatRate(data.oficial) : null,
    },
  ];

  const row = (ariaHidden: boolean) => (
    <div className="flex shrink-0 items-center" aria-hidden={ariaHidden}>
      {items.map((item) => {
        const isActive = source === item.key;
        return (
          <button
            key={`${item.key}-${ariaHidden ? 'b' : 'a'}`}
            type="button"
            tabIndex={ariaHidden ? -1 : 0}
            onClick={() => setSource(item.key as 'oficial' | 'paralelo')}
            className={cn(
              'flex items-center gap-1 whitespace-nowrap px-6 py-0 text-[11px] tabular-nums',
              isActive ? 'font-bold text-foreground' : 'font-medium text-muted-foreground',
            )}
            title={updatedLabel ? `Actualizado: ${updatedLabel}. Toca para usar esta tasa.` : 'Toca para usar esta tasa.'}
            aria-label={`Dólar ${item.label}: Bs ${item.value ?? 'N/D'}. Toca para usar esta tasa.`}
            aria-pressed={isActive}
          >
            <span
              className={cn(
                'rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide',
                isActive ? 'bg-primary text-primary-foreground' : 'bg-surface-active text-muted-foreground',
              )}
            >
              {item.label}
            </span>
            <span>Bs {item.value ?? 'N/D'}</span>
            {isActive && <ArrowLeftRight className="h-2.5 w-2.5 opacity-60" />}
          </button>
        );
      })}
      <span className="px-2 text-[10px] text-subtle-foreground" aria-hidden="true">
        {updatedLabel ? `act. ${updatedLabel}` : ''}
      </span>
    </div>
  );

  return (
    <div
      className={cn(
        'relative flex h-6 items-center overflow-hidden border-b border-border-subtle bg-surface-muted',
        className,
      )}
      role="marquee"
      aria-label={`Tasa del dólar: paralelo Bs ${items[0].value ?? 'N/D'}, BCV Bs ${items[1].value ?? 'N/D'}. Toca una tasa para usarla en las conversiones.`}
    >
      <div className="animate-ticker flex w-max">
        {row(false)}
        {row(true)}
      </div>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="absolute right-0 flex h-full w-8 items-center justify-center bg-surface-muted text-muted-foreground disabled:opacity-50"
        aria-label="Actualizar tasa"
      >
        <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
      </button>
    </div>
  );
}
