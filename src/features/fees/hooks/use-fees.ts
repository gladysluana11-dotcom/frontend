import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  cancelDiscount,
  closeCashBox,
  createEnrollmentDiscounts,
  createQuotaDiscount,
  createTariff,
  generateEnrollmentQuotas,
  getCashSummary,
  listAcademicLevels,
  listAcademicYears,
  listEnrollmentQuotas,
  listGrades,
  listTariffs,
  updateTariff,
  type SaveDiscountInput,
  type TariffListParams,
} from '../api/fees-api'

export function useTariffs(params: TariffListParams) {
  return useQuery({
    queryKey: ['fees', 'tariffs', params],
    queryFn: () => listTariffs(params),
    placeholderData: keepPreviousData,
  })
}

export function useAcademicYears() {
  return useQuery({
    queryKey: ['academic-years', 'fee-configuration'],
    queryFn: listAcademicYears,
  })
}

export function useAcademicLevels() {
  return useQuery({
    queryKey: ['academic-levels', 'fee-configuration'],
    queryFn: listAcademicLevels,
  })
}

export function useGrades() {
  return useQuery({
    queryKey: ['grades', 'fee-configuration'],
    queryFn: listGrades,
  })
}

export function useTariffMutations() {
  const client = useQueryClient()
  const options = {
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['fees', 'tariffs'] })
    },
  }
  const create = useMutation({ ...options, mutationFn: createTariff })
  const update = useMutation({
    ...options,
    mutationFn: ({
      id,
      values,
    }: {
      id: number
      values: Parameters<typeof updateTariff>[1]
    }) => updateTariff(id, values),
  })
  return { create, update }
}

export function useEnrollmentQuotas(id: number | undefined) {
  return useQuery({
    queryKey: ['payments', 'quotas', id],
    queryFn: () => listEnrollmentQuotas(id as number),
    enabled: id !== undefined,
    gcTime: 0,
  })
}

export function useGenerateEnrollmentQuotas(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ key }: { key: string }) => generateEnrollmentQuotas(id, key),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payments', 'quotas', id] }),
        client.invalidateQueries({ queryKey: ['payments', 'student-account'] }),
      ])
    },
  })
}

export function useCreateQuotaDiscount(quotaId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ values, key }: { values: SaveDiscountInput; key: string }) =>
      createQuotaDiscount(quotaId, values, key),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payments', 'quotas'] }),
        client.invalidateQueries({ queryKey: ['payments', 'student-account'] }),
      ])
    },
  })
}

export function useCreateEnrollmentDiscounts(enrollmentId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ values, key }: { values: SaveDiscountInput; key: string }) =>
      createEnrollmentDiscounts(enrollmentId, values, key),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payments', 'quotas'] }),
        client.invalidateQueries({ queryKey: ['payments', 'student-account'] }),
      ])
    },
  })
}

export function useCancelDiscount(discountId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({
      values,
      key,
    }: {
      values: { motivo: string }
      key: string
    }) => cancelDiscount(discountId, values, key),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payments', 'quotas'] }),
        client.invalidateQueries({ queryKey: ['payments', 'student-account'] }),
      ])
    },
  })
}

export function useCashSummary(date: string) {
  return useQuery({
    queryKey: ['cashbox', 'summary', date],
    queryFn: () => getCashSummary(date),
    enabled: date !== '',
  })
}

export function useCloseCashBox(date: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ observacion, key }: { observacion: string; key: string }) =>
      closeCashBox({ fecha: date, observacion, idempotencyKey: key }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['cashbox', 'summary', date] })
    },
  })
}
