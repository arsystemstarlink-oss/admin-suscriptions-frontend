import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  businessPlansApi,
  organizationPlanPaymentReportsApi,
  type OrganizationPlanQuoteParams,
} from '@/api/organization-plan-payment-reports.api'
import { qk } from '@/lib/query-keys'
import { handleApiError } from '@/lib/error-handler'
import type {
  CreateOrganizationPlanPaymentReportRequest,
  ReviewOrganizationPlanPaymentReportRequest,
} from '@/types/api'

export function useBusinessPlans() {
  return useQuery({
    queryKey: qk.businessPlans,
    queryFn: businessPlansApi.list,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useOrganizationPlanQuote(params: OrganizationPlanQuoteParams, enabled = true) {
  return useQuery({
    queryKey: qk.organizationPlanPaymentReports.quote(
      params.organizationId,
      params.plan,
      params.paidAt,
    ),
    queryFn: () => organizationPlanPaymentReportsApi.quote(params),
    enabled: enabled && Boolean(params.organizationId && params.plan && params.paidAt),
    placeholderData: keepPreviousData,
  })
}

export function useOrganizationPlanPaymentReports(enabled = true) {
  return useQuery({
    queryKey: qk.organizationPlanPaymentReports.mine,
    queryFn: organizationPlanPaymentReportsApi.listMine,
    enabled,
  })
}

export function useAllOrganizationPlanPaymentReports(
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL',
  enabled = true,
) {
  return useQuery({
    queryKey: [...qk.organizationPlanPaymentReports.lists, status],
    queryFn: () => organizationPlanPaymentReportsApi.list({ status, limit: 100 }),
    enabled,
  })
}

export function useCreateOrganizationPlanPaymentReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateOrganizationPlanPaymentReportRequest) =>
      organizationPlanPaymentReportsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.organizationPlanPaymentReports.mine })
      qc.invalidateQueries({ queryKey: qk.organizationPlanPaymentReports.lists })
      toast.success('Pago reportado. Queda en verificación.')
    },
    onError: (error) => handleApiError(error),
  })
}

export function useReviewOrganizationPlanPaymentReport() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: ReviewOrganizationPlanPaymentReportRequest
    }) => organizationPlanPaymentReportsApi.review(id, data),
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: qk.organizationPlanPaymentReports.lists })
      qc.invalidateQueries({ queryKey: qk.organizationPlanPaymentReports.mine })
      qc.invalidateQueries({ queryKey: qk.organizations.lists })
      qc.invalidateQueries({ queryKey: qk.auth.me })
      toast.success(
        result.report.status === 'APPROVED'
          ? 'Pago de plan aprobado y plan actualizado'
          : 'Reporte de plan rechazado',
      )
    },
    onError: (error) => handleApiError(error),
  })
}
