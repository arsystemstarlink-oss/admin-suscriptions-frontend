import { useMutation, useQuery } from '@tanstack/react-query'
import { publicPlansApi } from '@/api/public.api'
import { qk } from '@/lib/query-keys'
import type { CreatePlanQuoteRequest, PublicSignupRequest } from '@/types/api'

export function usePublicPaymentInstructions() {
  return useQuery({
    queryKey: qk.publicPaymentInstructions,
    queryFn: publicPlansApi.getPaymentInstructions,
    staleTime: 5 * 60 * 1000,
  })
}

export function usePublicSignup() {
  return useMutation({
    mutationFn: (data: PublicSignupRequest) => publicPlansApi.signup(data),
  })
}

export function useCreatePlanQuoteRequest() {
  return useMutation({
    mutationFn: (data: CreatePlanQuoteRequest) => publicPlansApi.createPlanQuoteRequest(data),
  })
}
