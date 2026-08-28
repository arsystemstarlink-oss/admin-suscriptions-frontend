import { create } from 'zustand'
import type { User } from '@/types/api'
import { authApi } from '@/api/auth.api'
import {
  clearStoredTokens,
  getStoredTokens,
  getStoredUser,
  setStoredTokens,
  setStorageMode,
  setStoredUser,
  type StorageMode,
} from '@/lib/tokenStorage'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string, mode?: StorageMode) => void
  setUser: (user: User) => void
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setTokens: (accessToken, refreshToken, mode) => {
    if (mode) setStorageMode(mode)
    setStoredTokens(accessToken, refreshToken)
    set({ accessToken, refreshToken, isAuthenticated: true })
  },

  setUser: (user) => {
    setStoredUser(user)
    set({ user })
  },

  logout: () => {
    const refreshToken = useAuthStore.getState().refreshToken
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {})
    }
    clearStoredTokens()
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
  },

  loadFromStorage: () => {
    const { accessToken, refreshToken } = getStoredTokens()
    const user = getStoredUser()

    if (accessToken && refreshToken) {
      set({ accessToken, refreshToken, user, isAuthenticated: true })
    } else if (useAuthStore.getState().isAuthenticated) {
      set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
    }
  },
}))

if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'accessToken' || event.key === 'refreshToken' || event.key === 'user') {
      useAuthStore.getState().loadFromStorage()
    }
  })
}

export function useIsSuperAdmin(): boolean {
  return useAuthStore((state) => state.user?.role === 'super-admin')
}
