import { useQuery } from '@tanstack/react-query';
import { fetchDolarRates, getCachedRates } from '@/lib/exchange';

export const EXCHANGE_QUERY_KEY = ['exchange', 'dolar-rates'] as const;

export function useDolarRates(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: EXCHANGE_QUERY_KEY,
    queryFn: ({ signal }) => fetchDolarRates(signal),
    initialData: () => {
      const cached = getCachedRates();
      if (!cached) return undefined;
      return {
        oficial: cached.oficial ?? null,
        paralelo: cached.paralelo ?? null,
        updatedAt: cached.updatedAt ?? null,
      };
    },
    staleTime: 10 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    retry: 1,
    ...options,
  });
}
