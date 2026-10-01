import { cn } from '@/lib/utils';
import { convertUsdToBs, formatBs } from '@/lib/exchange';

interface BsReferenceProps {
  usdAmount: number;
  rate: number | null | undefined;
  className?: string;
}

/** Referencia secundaria en Bs: nunca sustituye el monto USD (fuente de verdad para cobro). */
export function BsReference({ usdAmount, rate, className }: BsReferenceProps) {
  const bs = convertUsdToBs(usdAmount, rate);
  if (bs === null) return null;
  return <span className={cn('text-xs font-medium text-muted-foreground', className)}>≈ {formatBs(bs)}</span>;
}
