export type ExchangeSource = 'oficial' | 'paralelo';

export interface DolarApiQuote {
  moneda: string;
  fuente: string;
  nombre: string;
  compra: number | null;
  venta: number | null;
  promedio: number | null;
  fechaActualizacion: string;
}

export interface ExchangeRates {
  oficial: number | null;
  paralelo: number | null;
  updatedAt: string | null;
}

export const EXCHANGE_API_URL = 'https://ve.dolarapi.com/v1/dolares';
const RATES_CACHE_KEY = 'exchange.rates.cache';

export function parseDolarApiResponse(payload: unknown): ExchangeRates {
  if (!Array.isArray(payload)) {
    throw new Error('Respuesta de tasa inválida.');
  }
  let oficial: number | null = null;
  let paralelo: number | null = null;
  let updatedAt: string | null = null;

  for (const item of payload as DolarApiQuote[]) {
    const fuente = String(item?.fuente || '').toLowerCase();
    const rate = typeof item?.promedio === 'number' && Number.isFinite(item.promedio) ? item.promedio : null;
    if (rate === null || rate <= 0) continue;
    if (fuente === 'oficial' && oficial === null) {
      oficial = rate;
      updatedAt = item.fechaActualizacion || updatedAt;
    }
    if (fuente === 'paralelo' && paralelo === null) {
      paralelo = rate;
      updatedAt = item.fechaActualizacion || updatedAt;
    }
  }

  return { oficial, paralelo, updatedAt };
}

export async function fetchDolarRates(signal?: AbortSignal): Promise<ExchangeRates> {
  const response = await fetch(EXCHANGE_API_URL, { signal });
  if (!response.ok) {
    throw new Error('No se pudo obtener la tasa del dólar.');
  }
  const payload = await response.json();
  const parsed = parseDolarApiResponse(payload);
  if (parsed.oficial === null && parsed.paralelo === null) {
    throw new Error('Tasa del dólar no disponible.');
  }
  try {
    localStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ ...parsed, cachedAt: new Date().toISOString() }));
  } catch {
    // almacenamiento no disponible: se ignora, la memoria de react-query sigue funcionando
  }
  return parsed;
}

export function getCachedRates(): (ExchangeRates & { cachedAt?: string }) | null {
  try {
    const raw = localStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExchangeRates & { cachedAt?: string };
    if (typeof parsed.oficial !== 'number' && typeof parsed.paralelo !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

export function getRateForSource(rates: ExchangeRates | null | undefined, source: ExchangeSource): number | null {
  if (!rates) return null;
  const value = source === 'oficial' ? rates.oficial : rates.paralelo;
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function convertUsdToBs(usdAmount: number, rate: number | null | undefined): number | null {
  if (rate === null || rate === undefined || !Number.isFinite(rate) || rate <= 0) return null;
  if (!Number.isFinite(usdAmount)) return null;
  return usdAmount * rate;
}

export function formatBs(amountBs: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'VES',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountBs);
}

export function formatUsd(amountUsd: number): string {
  return new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amountUsd);
}

export function formatRate(rate: number): string {
  return new Intl.NumberFormat('es-VE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rate);
}

export function formatRateUpdatedAt(isoDate: string | null | undefined): string | null {
  if (!isoDate) return null;
  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat('es-VE', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}
