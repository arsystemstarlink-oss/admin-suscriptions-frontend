import { useDolarRates } from '@/hooks/useExchange';
import { useExchangeStore } from '@/stores/exchange.store';
import { formatRate, formatRateUpdatedAt, getRateForSource } from '@/lib/exchange';
import { cn } from '@/lib/utils';
import { ArrowLeftRight, RefreshCw } from 'lucide-react';

interface ExchangeRateBadgeProps {
  className?: string;
  compact?: boolean;
}

export function ExchangeRateBadge({ className, compact = false }: ExchangeRateBadgeProps) {
  const source = useExchangeStore((s) => s.source);
  const setSource = useExchangeStore((s) => s.setSource);
  const { data, isLoading, isError, refetch, isFetching } = useDolarRates();

  const rate = getRateForSource(data, source);
  const updatedLabel = formatRateUpdatedAt(data?.updatedAt);

  const toggleSource = () => {
    setSource(source === 'paralelo' ? 'oficial' : 'paralelo');
  };

  if (isLoading && !data) {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs text-muted-foreground',
          className,
        )}
        aria-label="Cargando tasa del dólar"
      >
        <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary" />
        {!compact && <span>Tasa...</span>}
      </div>
    );
  }

  if ((isError || rate === null) && !data) {
    return (
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className={cn(
          'flex items-center gap-1.5 rounded-full border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-surface-hover',
          className,
        )}
        title="Tasa no disponible. Toca para reintentar."
      >
        <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
        {!compact && <span>Tasa N/D</span>}
      </button>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1 rounded-full border border-border bg-surface-muted py-0.5 pl-2.5 pr-0.5 text-xs',
        className,
      )}
      title={updatedLabel ? `Actualizado: ${updatedLabel}` : undefined}
    >
      <button
        type="button"
        onClick={toggleSource}
        className="flex items-center gap-1 font-semibold text-foreground transition-opacity hover:opacity-70"
        title={`Toca para cambiar a ${source === 'paralelo' ? 'oficial BCV' : 'paralelo'}`}
        aria-label={`Tasa ${source === 'paralelo' ? 'paralela' : 'oficial BCV'}: ${rate !== null ? formatRate(rate) : 'N/D'} Bs. Toca para cambiar.`}
      >
        <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
        <span className="tabular-nums">Bs {rate !== null ? formatRate(rate) : 'N/D'}</span>
        <span className="rounded-full bg-surface-active px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
          {source === 'paralelo' ? 'Par' : 'BCV'}
        </span>
      </button>
      <button
        type="button"
        onClick={() => refetch()}
        disabled={isFetching}
        className="flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50"
        aria-label="Actualizar tasa"
        title={updatedLabel ? `Actualizado: ${updatedLabel}` : 'Actualizar tasa'}
      >
        <RefreshCw className={cn('h-3 w-3', isFetching && 'animate-spin')} />
      </button>
    </div>
  );
}
