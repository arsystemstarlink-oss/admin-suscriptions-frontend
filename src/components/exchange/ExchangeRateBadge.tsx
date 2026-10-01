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

  const rateLabel = rate !== null ? formatRate(rate) : 'N/D';
  const toggleTitle = updatedLabel
    ? `Tasa ${source === 'paralelo' ? 'paralela' : 'oficial BCV'}: Bs ${rateLabel} (act. ${updatedLabel}). Toca para cambiar.`
    : `Toca para cambiar a ${source === 'paralelo' ? 'oficial BCV' : 'paralelo'}`;

  if (compact) {
    if (isLoading && !data) {
      return (
        <div
          className={cn(
            'flex items-center rounded-full border border-border bg-surface-muted px-2 py-1 text-muted-foreground',
            className,
          )}
          aria-label="Cargando tasa del dólar"
        >
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary" />
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
            'flex min-w-0 items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-1 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-surface-hover disabled:opacity-50',
            className,
          )}
          title="Tasa no disponible. Toca para reintentar."
          aria-label="Tasa no disponible. Toca para reintentar."
        >
          <RefreshCw className={cn('h-3 w-3 shrink-0', isFetching && 'animate-spin')} />
          <span className="shrink-0">N/D</span>
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={toggleSource}
        className={cn(
          'flex min-w-0 max-w-[128px] items-center gap-1 rounded-full border border-border bg-surface-muted px-2 py-1 text-[11px] transition-opacity hover:opacity-80',
          className,
        )}
        title={toggleTitle}
        aria-label={`Tasa ${source === 'paralelo' ? 'paralela' : 'oficial BCV'}: Bs ${rateLabel}. Toca para cambiar.`}
      >
        <span className="truncate tabular-nums font-semibold text-foreground">Bs {rateLabel}</span>
        <span className="shrink-0 rounded-full bg-surface-active px-1 py-px text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
          {source === 'paralelo' ? 'Par' : 'BCV'}
        </span>
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
