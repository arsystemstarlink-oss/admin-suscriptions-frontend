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

export function useClients(params?: UseClientsParams) {
  return useQuery({
    queryKey: [...qk.clients.lists, params],
    queryFn: () => clientsApi.list(params),
  })
}

export function useClientDetail(id: string) {
  return useQuery({
    queryKey: qk.clients.detail(id),
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
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
    mutationFn: ({ id, data }: { id: string; data: UpdateClientRequest }) =>
      clientsApi.update(id, data),
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
