import { useMutation, useQuery } from '@tanstack/react-query'
import {
  downloadReport,
  getDirectorDashboard,
  getEnrollmentReport,
  getMonthlyIncomeReport,
  getPaymentReport,
  type ReportKind,
  type ReportParams,
} from '../api/reports-api'

const MEMORY_CACHE_TIME = 0

export function useEnrollmentReport(params: ReportParams, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'enrollments', params],
    queryFn: () => getEnrollmentReport(params),
    enabled,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function usePaymentReport(params: ReportParams, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'payments', params],
    queryFn: () => getPaymentReport(params),
    enabled,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useMonthlyIncomeReport(params: ReportParams, enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'monthly-income', params],
    queryFn: () => getMonthlyIncomeReport(params),
    enabled,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useDirectorDashboard(enabled: boolean) {
  return useQuery({
    queryKey: ['reports', 'director-dashboard'],
    queryFn: getDirectorDashboard,
    enabled,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useDownloadReport() {
  return useMutation({
    mutationFn: (input: {
      kind: ReportKind
      params: ReportParams
      format: 'pdf' | 'xlsx'
    }) => downloadReport(input.kind, input.params, input.format),
  })
}
