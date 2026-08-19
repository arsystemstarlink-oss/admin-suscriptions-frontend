import { create } from 'zustand'
import type { User } from '@/types/api'
import { authApi } from '@/api/auth.api'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: User | null
  isAuthenticated: boolean
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: User) => void
  logout: () => void
  loadFromStorage: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  user: null,
  isAuthenticated: false,

  setTokens: (accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken)
    localStorage.setItem('refreshToken', refreshToken)
    set({ accessToken, refreshToken, isAuthenticated: true })
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user))
    set({ user })
  },

  logout: () => {
    const refreshToken = useAuthStore.getState().refreshToken
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {})
    }
    localStorage.removeItem('accessToken')
    localStorage.removeItem('refreshToken')
    localStorage.removeItem('user')
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
  },

  loadFromStorage: () => {
    const accessToken = localStorage.getItem('accessToken')
    const refreshToken = localStorage.getItem('refreshToken')
    const userStr = localStorage.getItem('user')
    const user = userStr ? JSON.parse(userStr) : null

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
