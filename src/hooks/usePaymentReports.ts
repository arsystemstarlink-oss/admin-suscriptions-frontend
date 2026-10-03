import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { paymentReportsApi } from '@/api/payment-reports.api'
import { publicPortalApi } from '@/api/public.api'
import { qk } from '@/lib/query-keys'
import type {
  CreatePublicReportRequest,
  PublicLookupRequest,
  ReviewPaymentReportRequest,
} from '@/types/api'
import { toast } from 'sonner'

interface UsePaymentReportsParams {
  status?: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL'
  organizationId?: string
  limit?: number
  offset?: number
}

export function usePaymentReports(
  params?: UsePaymentReportsParams,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...qk.paymentReports.lists, params],
    queryFn: () => paymentReportsApi.list(params),
    ...options,
  })
}

export function usePendingReportsCount(
  params?: { organizationId?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: [...qk.paymentReports.count, params?.organizationId],
    queryFn: () => paymentReportsApi.getPendingCount(params),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    ...options,
  })
}

export function useReviewPaymentReport() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: ReviewPaymentReportRequest }) =>
      paymentReportsApi.review(id, data),
    onSuccess: (response, variables) => {
      qc.invalidateQueries({ queryKey: qk.paymentReports.lists })
      qc.invalidateQueries({ queryKey: qk.paymentReports.count })
      qc.invalidateQueries({ queryKey: qk.paymentReports.detail(variables.id) })
      qc.invalidateQueries({ queryKey: qk.billing.lists })
      qc.invalidateQueries({ queryKey: qk.subscriptions.lists })
      qc.invalidateQueries({ queryKey: qk.dashboard.summary })
      qc.invalidateQueries({ queryKey: qk.dashboard.alerts })

      if (response.subscription?.reactivated) {
        toast.success('Reporte aprobado — Suscripción reactivada automáticamente')
      } else if (variables.data.action === 'approve') {
        toast.success('Reporte aprobado y pago registrado')
      } else {
        toast.success('Reporte rechazado')
      }
    },
    onError: (error: unknown) => {
      const apiError = error as { code?: string; message?: string }
      if (apiError.code === 'PAYMENT_REPORT_ALREADY_REVIEWED') {
        toast.warning('Este reporte ya fue revisado por otro administrador')
        qc.invalidateQueries({ queryKey: qk.paymentReports.lists })
        qc.invalidateQueries({ queryKey: qk.paymentReports.count })
      } else if (apiError.code === 'PERIOD_ALREADY_PAID') {
        toast.warning('Este período ya fue pagado previamente')
        qc.invalidateQueries({ queryKey: qk.paymentReports.lists })
        qc.invalidateQueries({ queryKey: qk.paymentReports.count })
        qc.invalidateQueries({ queryKey: qk.billing.lists })
      } else {
        toast.error(apiError.message || 'Error al procesar el reporte')
      }
    },
  })
}

export function usePublicOrganization(slug: string | undefined, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['public', 'org', slug],
    queryFn: () => publicPortalApi.getOrganization(slug!),
    enabled: !!slug && (options?.enabled ?? true),
    retry: false,
    staleTime: 5 * 60_000,
  })
}

export function usePublicLookup(slug: string | undefined) {
  return useMutation({
    mutationFn: (data: PublicLookupRequest) => publicPortalApi.lookup(slug!, data),
  })
}

export function usePublicCreateReport(slug: string | undefined) {
  return useMutation({
    mutationFn: (data: CreatePublicReportRequest) => publicPortalApi.createReport(slug!, data),
  })
}
