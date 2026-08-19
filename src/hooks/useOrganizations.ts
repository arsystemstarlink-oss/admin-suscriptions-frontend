import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { organizationsApi } from '@/api/organizations.api'
import { qk } from '@/lib/query-keys'
import type { CreateOrganizationRequest, UpdateOrganizationRequest } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'

interface UseOrganizationsParams {
  search?: string
  limit?: number
  offset?: number
}

export function useOrganizations(params?: UseOrganizationsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.organizations.lists, params],
    queryFn: () => organizationsApi.list(params),
    enabled: options?.enabled ?? true,
  })
}

export function useOrganizationDetail(id: string) {
  return useQuery({
    queryKey: qk.organizations.detail(id),
    queryFn: () => organizationsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateOrganization() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateOrganizationRequest) => organizationsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      toast.success('Organización creada correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useUpdateOrganization() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateOrganizationRequest }) =>
      organizationsApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      qc.invalidateQueries({ queryKey: qk.organizations.detail(variables.id) })
      toast.success('Organización actualizada correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useDeleteOrganization() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => organizationsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      toast.success('Organización eliminada correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}
