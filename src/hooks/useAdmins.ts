import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminsApi } from '@/api/admins.api'
import { qk } from '@/lib/query-keys'
import type { AdminsListResponse, CreateAdminRequest, UpdateAdminRequest } from '@/types/api'
import { toast } from 'sonner'
import { handleApiError } from '@/lib/error-handler'

const ADMIN_LISTS_KEY = [...qk.auth.me, 'admins'] as const

interface UseAdminsParams {
  search?: string
  limit?: number
  offset?: number
  organizationId?: string
}

export function useAdmins(params?: UseAdminsParams) {
  return useQuery({
    queryKey: [...ADMIN_LISTS_KEY, params],
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
    // Optimista: la fila desaparece al confirmar y vuelve si el servidor rechaza el borrado.
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ADMIN_LISTS_KEY })
      const previous = qc.getQueriesData<AdminsListResponse>({ queryKey: ADMIN_LISTS_KEY })
      previous.forEach(([queryKey, data]) => {
        if (!data) return
        qc.setQueryData<AdminsListResponse>(queryKey, {
          ...data,
          admins: data.admins.filter((admin) => admin.id !== id),
        })
      })
      return { previous }
    },
    onSuccess: () => {
      toast.success('Administrador eliminado correctamente')
    },
    onError: (err, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data))
      handleApiError(err)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.auth.me })
    },
  })
}
