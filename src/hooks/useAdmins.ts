import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminsApi } from '@/api/admins.api'
import { qk } from '@/lib/query-keys'
import type { CreateAdminRequest, UpdateAdminRequest } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'

interface UseAdminsParams {
  search?: string
  limit?: number
  offset?: number
  organizationId?: string
}

export function useAdmins(params?: UseAdminsParams) {
  return useQuery({
    queryKey: [...qk.auth.me, 'admins', params],
    queryFn: () => adminsApi.list(params),
  })
}

export function useAdminDetail(id: string) {
  return useQuery({
    queryKey: ['admins', id, 'detail'],
    queryFn: () => adminsApi.getById(id),
    enabled: !!id,
  })
}

export function useCreateAdmin() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateAdminRequest) => adminsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.auth.me })
      toast.success('Administrador creado correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useUpdateAdmin() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateAdminRequest }) =>
      adminsApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.auth.me })
      qc.invalidateQueries({ queryKey: ['admins', variables.id, 'detail'] })
      toast.success('Administrador actualizado correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}

export function useDeleteAdmin() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => adminsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.auth.me })
      toast.success('Administrador eliminado correctamente')
    },
    onError: (err) => handleApiError(err),
  })
}
