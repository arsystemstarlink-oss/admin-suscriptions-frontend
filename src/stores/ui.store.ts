import { create } from 'zustand'
import type { BillingPeriodWithDetails } from '@/types/api'

interface QuickPayContext {
  period: BillingPeriodWithDetails
}

interface UIState {
  quickPayOpen: boolean
  quickPayContext: QuickPayContext | null
  omniSearchOpen: boolean
  readChatTimestamps: Record<string, number>
  billingActionCount: number
  openQuickPay: (context: QuickPayContext) => void
  closeQuickPay: () => void
  openOmniSearch: () => void
  closeOmniSearch: () => void
  markChatAsRead: (phone: string, readAt?: number) => void
  setBillingActionCount: (count: number) => void
}

const READ_CHAT_STORAGE_KEY = 'ar-system-chat-read-timestamps'

const getStoredReadChatTimestamps = (): Record<string, number> => {
  if (typeof window === 'undefined') return {}

  try {
    const persisted = window.localStorage.getItem(READ_CHAT_STORAGE_KEY)
    if (!persisted) return {}

    const parsed = JSON.parse(persisted) as Record<string, number>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

const persistReadChatTimestamps = (timestamps: Record<string, number>) => {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(READ_CHAT_STORAGE_KEY, JSON.stringify(timestamps))
}

export const useUIStore = create<UIState>((set) => ({
  quickPayOpen: false,
  quickPayContext: null,
  omniSearchOpen: false,
  readChatTimestamps: getStoredReadChatTimestamps(),
  billingActionCount: 0,

  openQuickPay: (context) => set({ quickPayOpen: true, quickPayContext: context }),
  closeQuickPay: () => set({ quickPayOpen: false, quickPayContext: null }),
  openOmniSearch: () => set({ omniSearchOpen: true }),
  closeOmniSearch: () => set({ omniSearchOpen: false }),
  markChatAsRead: (phone, readAt = Date.now()) =>
    set((state) => {
      const nextReadChatTimestamps = {
        ...state.readChatTimestamps,
        [phone]: readAt,
      }

      persistReadChatTimestamps(nextReadChatTimestamps)

      return {
        readChatTimestamps: nextReadChatTimestamps,
      }
    }),
  setBillingActionCount: (count) => set({ billingActionCount: count }),
}))
