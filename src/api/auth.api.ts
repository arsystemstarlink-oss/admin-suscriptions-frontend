import { api } from './client'
import type { LoginRequest, LoginResponse, MeResponse, RefreshResponse } from '@/types/api'

export const authApi = {
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/login', data)
    return response.data
  },

  refresh: async (refreshToken: string): Promise<RefreshResponse> => {
    const response = await api.post<RefreshResponse>('/auth/refresh', { refreshToken })
    return response.data
  },

  me: async (): Promise<MeResponse> => {
    const response = await api.get<MeResponse>('/auth/me')
    return response.data
  },
}
