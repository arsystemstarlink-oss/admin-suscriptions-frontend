import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients.api'
import { qk } from '@/lib/query-keys'
import type { CreateClientRequest, UpdateClientRequest } from '@/types/api'

interface UseClientsParams {
  search?: string
  subscriptionStatus?: 'ACTIVE' | 'SUSPENDED' | 'MIXED' | 'NONE'
  hasOverdue?: boolean
  organizationId?: string
  limit?: number
  offset?: number
}

export function useClients(params?: UseClientsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.clients.lists, params],
    queryFn: () => clientsApi.list(params),
    ...options,
  })
}

export function useClientDetail(id: string, organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: qk.clients.detail(id, organizationId),
    queryFn: () => clientsApi.getById(id, organizationId),
    enabled: !!id && (options?.enabled ?? true),
  })
}

export function useCreateClient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateClientRequest) => clientsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
  })
}

export function useUpdateClient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data, organizationId }: { id: string; data: UpdateClientRequest; organizationId?: string }) =>
      clientsApi.update(id, data, organizationId),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.clients.lists })
      qc.invalidateQueries({ queryKey: qk.clients.detail(variables.id) })
    },
  })
}

export function useDeleteClient() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => clientsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
  })
}
