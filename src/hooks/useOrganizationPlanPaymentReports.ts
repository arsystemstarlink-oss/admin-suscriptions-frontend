import { useEffect, useRef } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  businessPlansApi,
  organizationPlanPaymentReportsApi,
  type OrganizationPlanQuoteParams,
} from '@/api/organization-plan-payment-reports.api'
import { qk } from '@/lib/query-keys'
import { handleApiError } from '@/lib/error-handler'
import { useAuthStore } from '@/stores/auth.store'
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
  const qc = useQueryClient()
  const user = useAuthStore((state) => state.user)
  const lastResolvedRef = useRef<string | null>(null)

  const query = useQuery({
    queryKey: qk.organizationPlanPaymentReports.mine,
    queryFn: organizationPlanPaymentReportsApi.listMine,
    enabled,
    // Mientras hay un pago en verificación, refresca para que el admin vea el
    // resultado sin tener que recargar la página.
    refetchInterval: (current) =>
      current.state.data?.reports.some((report) => report.status === 'PENDING') ? 20_000 : false,
  })

  useEffect(() => {
    if (!query.data) return
    const approved = query.data.reports
      .filter((report) => report.status === 'APPROVED')
      .map((report) => `${report.id}:${report.reviewedAt ?? ''}`)
      .join('|')
    if (!approved) return
    if (lastResolvedRef.current === approved) return
    const stillOnTrial = user?.organization?.planStatus === 'prueba'
    lastResolvedRef.current = approved
    // La aprobación cambia el plan de la organización: refresca /auth/me para
    // que el store y el DTO de organización dejen de mostrar la prueba.
    if (stillOnTrial) {
      qc.invalidateQueries({ queryKey: qk.auth.me })
    }
  }, [query.data, qc, user?.organization?.planStatus])

  return query
}

export function useAllOrganizationPlanPaymentReports(
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'ALL',
  enabled = true,
) {
  return useQuery({
    queryKey: [...qk.organizationPlanPaymentReports.lists, status],
    queryFn: () => organizationPlanPaymentReportsApi.list({ status, limit: 100 }),
    enabled,
    refetchInterval: status === 'PENDING' ? 30_000 : false,
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
    onSuccess: (result, variables) => {
      if (result.report.status !== 'PENDING') {
        // Quita el reporte de la bandeja de pendientes de inmediato, sin esperar
        // al refetch, para que la aprobación se refleje al instante.
        qc.setQueryData<Awaited<ReturnType<typeof organizationPlanPaymentReportsApi.list>>>(
          [...qk.organizationPlanPaymentReports.lists, 'PENDING'],
          (current) =>
            current
              ? {
                  ...current,
                  reports: current.reports.filter((report) => report.id !== variables.id),
                }
              : current,
        )
      }
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
