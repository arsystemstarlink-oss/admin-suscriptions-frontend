import { useInfiniteQuery, useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { subscriptionsApi } from '@/api/subscriptions.api'
import { qk } from '@/lib/query-keys'
import type {
  CreateSubscriptionRequest,
  Pagination,
  PayAdvanceRequest,
  SubscriptionWithDetails,
  UpdateSubscriptionRequest,
} from '@/types/api'
import { useOrganizationStore } from '@/stores/organization.store'
import { toast } from 'sonner'

interface UseSubscriptionsParams {
  clientId?: string
  status?: 'ACTIVE' | 'SUSPENDED'
  search?: string
  hasOverduePeriods?: boolean
  expiring?: boolean
  pending?: boolean
  organizationId?: string
  limit?: number
  offset?: number
}

type SubscriptionPageParam = Pick<Pagination, 'offset'> & { cursor?: string }

interface SubscriptionListPage {
  subscriptions: SubscriptionWithDetails[]
  pagination: Pagination
}

type SubscriptionCacheData =
  | SubscriptionListPage
  | { pages: SubscriptionListPage[]; pageParams: unknown[] }

export function useSubscriptions(params?: UseSubscriptionsParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.subscriptions.lists, params],
    queryFn: () => subscriptionsApi.list(params),
    ...options,
  })
}

/**
 * Cuántas suscripciones devuelve cada filtro de cobranza en toda la organización.
 * Pide una sola fila: basta `pagination.total`, que el servidor calcula con el mismo
 * filtro de la lista, así el número coincide con lo que se ve al aplicarlo.
 */
export function useSubscriptionFilterTotals(organizationId?: string, options?: { enabled?: boolean }) {
  const filters = [{ hasOverduePeriods: true }, { expiring: true }, { pending: true }]
  const [overdue, expiring, pending] = useQueries({
    queries: filters.map((filter) => ({
      queryKey: [...qk.subscriptions.lists, 'filter-total', { organizationId, ...filter }],
      queryFn: async () =>
        (await subscriptionsApi.list({ organizationId, ...filter, limit: 1 })).pagination.total,
      enabled: options?.enabled,
    })),
  })

  return { overdue: overdue.data, expiring: expiring.data, pending: pending.data }
}

export function useInfiniteSubscriptions(
  params: UseSubscriptionsParams,
  options?: { enabled?: boolean }
) {
  const limit = params.limit ?? 50

  return useInfiniteQuery({
    queryKey: [...qk.subscriptions.lists, params, 'infinite'],
    initialPageParam: { offset: 0 } as SubscriptionPageParam,
    queryFn: ({ pageParam }) =>
      subscriptionsApi.list({
        ...params,
        offset: pageParam.cursor ? undefined : pageParam.offset,
        cursor: pageParam.cursor,
      }),
    getNextPageParam: (lastPage, pages): SubscriptionPageParam | undefined => {
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

export function useSubscriptionDetail(id: string, organizationId?: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...qk.subscriptions.detail(id), organizationId],
    queryFn: () => subscriptionsApi.getById(id, organizationId),
    enabled: !!id && (options?.enabled ?? true),
  })
}

export function useCreateSubscription() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (data: CreateSubscriptionRequest) => subscriptionsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
  })
}

export function useUpdateSubscription() {
  const qc = useQueryClient()
  const selectedOrganizationId = useOrganizationStore((state) => state.selectedOrganizationId)

  return useMutation({
    mutationFn: ({
      id,
      data,
      organizationId,
    }: {
      id: string
      data: UpdateSubscriptionRequest
      organizationId?: string
    }) => subscriptionsApi.update(id, data, organizationId ?? selectedOrganizationId ?? undefined),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.detail(variables.id) })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
  })
}

export function useDeleteSubscription() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => subscriptionsApi.remove(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: qk.subscriptions.lists })
      const previous = qc.getQueriesData<SubscriptionCacheData>({ queryKey: qk.subscriptions.lists })
      previous.forEach(([queryKey, data]) => {
        if (!data) return
        if ('pages' in data) {
          qc.setQueryData(queryKey, {
            ...data,
            pages: data.pages.map((page) => ({
              ...page,
              subscriptions: page.subscriptions.filter((subscription) => subscription.id !== id),
            })),
          } as SubscriptionCacheData)
        } else {
          qc.setQueryData(queryKey, {
            ...data,
            subscriptions: data.subscriptions.filter((subscription) => subscription.id !== id),
          } as SubscriptionCacheData)
        }
      })
      return { previous }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
    onError: (_error, _id, context) => {
      context?.previous.forEach(([queryKey, data]) => qc.setQueryData(queryKey, data))
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.clients.lists })
    },
  })
}

export function usePayAdvance(subscriptionId: string) {
  const qc = useQueryClient()
  const organizationId = useOrganizationStore((state) => state.selectedOrganizationId)

  return useMutation({
    mutationFn: (data: PayAdvanceRequest) =>
      subscriptionsApi.payAdvance(subscriptionId, data, organizationId ?? undefined),
    onSuccess: (response) => {
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.detail(response.subscription.id) })
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: ['clients'] })
      qc.invalidateQueries({ queryKey: qk.dashboard.summary })
      qc.invalidateQueries({ queryKey: qk.dashboard.alerts })
      toast.success('Adelanto registrado — próximo ciclo pagado')
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string; message?: string }
      if (apiError.code === 'HAS_UNPAID_PERIODS') {
        toast.error('Tiene períodos pendientes: cóbrelos primero')
      } else if (apiError.code === 'PERIOD_ALREADY_EXISTS') {
        toast.warning('El siguiente ciclo ya existe')
        qc.invalidateQueries({ queryKey: qk.billing.lists })
        qc.invalidateQueries({ queryKey: qk.subscriptions.detail(subscriptionId) })
      } else if (apiError.code === 'SUBSCRIPTION_SUSPENDED') {
        toast.error('Suscripción suspendida: cobre los vencidos primero')
      } else if (apiError.code === 'INVALID_PERIOD_STATE') {
        toast.error('La suscripción no está en un estado que permita registrar el adelanto')
      } else if (apiError.code === 'INVALID_DATE_FORMAT') {
        toast.error('El formato de fecha de pago no es válido')
      } else {
        toast.error(apiError.message || 'Error al registrar el adelanto')
      }
    },
  })
}
