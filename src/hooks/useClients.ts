import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clientsApi } from '@/api/clients.api'
import { qk } from '@/lib/query-keys'
import type { CreateClientRequest, Pagination, UpdateClientRequest } from '@/types/api'

interface UseClientsParams {
  search?: string
  subscriptionStatus?: 'ACTIVE' | 'SUSPENDED' | 'MIXED' | 'NONE'
  hasOverdue?: boolean
  organizationId?: string
  limit?: number
  offset?: number
}

type ClientPageParam = Pick<Pagination, 'offset'> & { cursor?: string }

export function useClients(params?: UseClientsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.clients.lists, params],
    queryFn: () => clientsApi.list(params),
    ...options,
  })
}

export function useInfiniteClients(params: UseClientsParams, options?: { enabled?: boolean }) {
  const limit = params.limit ?? 50

  return useInfiniteQuery({
    queryKey: [...qk.clients.lists, params, 'infinite'],
    initialPageParam: { offset: 0 } as ClientPageParam,
    queryFn: ({ pageParam }) =>
      clientsApi.list({
        ...params,
        offset: pageParam.cursor ? undefined : pageParam.offset,
        cursor: pageParam.cursor,
      }),
    getNextPageParam: (lastPage, pages): ClientPageParam | undefined => {
      if (!lastPage.pagination.hasMore) return undefined

      if (params.search) {
        return { offset: pages.length * limit }
      }

      return lastPage.pagination.nextCursor
        ? { offset: 0, cursor: lastPage.pagination.nextCursor }
        : undefined
    },
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
      qc.resetQueries({ queryKey: ['subscriptions'] })
      qc.invalidateQueries({ queryKey: qk.dashboard.alerts })
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
