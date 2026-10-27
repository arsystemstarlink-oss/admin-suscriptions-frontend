import { api } from './client'
import type {
  AcceptInviteRequest,
  AcceptInviteResponse,
  ChangePasswordRequest,
  ChangePasswordResponse,
  CreateAdminRequest,
  CreateAdminResponse,
  InvitePreviewResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
  RefreshResponse,
  UpdateMeRequest,
} from '@/types/api'

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

  updateMe: async (data: UpdateMeRequest): Promise<MeResponse> => {
    const response = await api.put<MeResponse>('/auth/me', data)
    return response.data
  },

  changePassword: async (data: ChangePasswordRequest): Promise<ChangePasswordResponse> => {
    const response = await api.post<ChangePasswordResponse>('/auth/change-password', data)
    return response.data
  },

  getInvite: async (token: string): Promise<InvitePreviewResponse> => {
    const response = await api.get<InvitePreviewResponse>(`/auth/invite/${encodeURIComponent(token)}`)
    return response.data
  },

  acceptInvite: async (data: AcceptInviteRequest): Promise<AcceptInviteResponse> => {
    const response = await api.post<AcceptInviteResponse>('/auth/invite/accept', data)
    return response.data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await api.post('/auth/logout', { refreshToken })
  },

  setup: async (data: CreateAdminRequest, setupKey: string): Promise<CreateAdminResponse> => {
    const response = await api.post<CreateAdminResponse>('/auth/setup', data, {
      headers: { 'X-Setup-Key': setupKey },
    })
    return response.data
  },

  register: async (data: CreateAdminRequest): Promise<CreateAdminResponse> => {
    const response = await api.post<CreateAdminResponse>('/auth/register', data)
    return response.data
  },
}
