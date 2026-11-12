import { create } from 'zustand'
import type { User } from '@/types/api'
import { authApi } from '@/api/auth.api'
import { queryClient } from '@/lib/queryClient'
import { detachPushOnLogout } from '@/lib/push'
import { useOrganizationStore } from '@/stores/organization.store'
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
    // Del storage, no del store: el interceptor de la API renueva los tokens solo
    // en storage, y revocar uno ya reemplazado dejaría abierta la sesión real.
    const { accessToken, refreshToken } = getStoredTokens()
    // En dispositivos compartidos, los avisos de esta cuenta no deben seguir llegando.
    void detachPushOnLogout(accessToken)
    if (refreshToken) {
      authApi.logout(refreshToken).catch(() => {})
    }
    clearStoredTokens()
    // Vacía la caché de React Query: en dispositivos compartidos los datos de
    // la sesión anterior no deben quedar en memoria para el próximo usuario.
    queryClient.clear()
    // La organización seleccionada es contexto de sesión del super-admin:
    // al cerrar sesión no debe sobrevivir (ni en storage ni en memoria)
    // para el próximo usuario.
    try {
      localStorage.removeItem('selectedOrganizationId')
      sessionStorage.removeItem('selectedOrganizationId')
    } catch {
      // storage no disponible; se ignora
    }
    useOrganizationStore.setState({ selectedOrganizationId: null })
    set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
  },

  loadFromStorage: () => {
    const { accessToken, refreshToken } = getStoredTokens()
    const user = getStoredUser()

    if (accessToken && refreshToken) {
      set({ accessToken, refreshToken, user, isAuthenticated: true })
    } else if (useAuthStore.getState().isAuthenticated) {
      // La sesión se cerró en otra pestaña: esta tampoco debe conservar sus datos.
      void detachPushOnLogout(useAuthStore.getState().accessToken)
      queryClient.clear()
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
