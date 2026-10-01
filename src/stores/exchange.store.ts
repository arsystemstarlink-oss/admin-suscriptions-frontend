import { create } from 'zustand';
import type { ExchangeSource } from '@/lib/exchange';

interface ExchangeState {
  source: ExchangeSource;
  setSource: (source: ExchangeSource) => void;
  loadFromStorage: () => void;
}

const EXCHANGE_SOURCE_KEY = 'exchange.source';

export const useExchangeStore = create<ExchangeState>((set) => ({
  source: 'paralelo',
  setSource: (source) => {
    try {
      localStorage.setItem(EXCHANGE_SOURCE_KEY, source);
    } catch {
      // almacenamiento no disponible: solo memoria
    }
    set({ source });
  },
  loadFromStorage: () => {
    try {
      const stored = localStorage.getItem(EXCHANGE_SOURCE_KEY);
      set({ source: stored === 'oficial' ? 'oficial' : 'paralelo' });
    } catch {
      set({ source: 'paralelo' });
    }
  },
}));

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === EXCHANGE_SOURCE_KEY) {
      useExchangeStore.getState().loadFromStorage();
    }
  });
}
