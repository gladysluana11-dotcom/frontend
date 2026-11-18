import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  createCollection,
  getDebtAlerts,
  listCollectionHistory,
  listDebts,
  listDebtsByClass,
  downloadDebtsByClass,
  type DebtParams,
} from '../api/debts-api'

const MEMORY_CACHE_TIME = 0

export function useDebts(params: DebtParams) {
  return useQuery({
    queryKey: ['debts', 'list', params],
    queryFn: () => listDebts(params),
    placeholderData: keepPreviousData,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useDebtsByClass(params: DebtParams) {
  return useQuery({
    queryKey: ['debts', 'by-class', params],
    queryFn: () => listDebtsByClass(params),
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useCollectionHistory(studentId: number | undefined, page = 1) {
  return useQuery({
    queryKey: ['collections', studentId, page],
    queryFn: () => listCollectionHistory(studentId as number, page),
    enabled: studentId !== undefined,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useCreateCollection(studentId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (values: Parameters<typeof createCollection>[1]) =>
      createCollection(studentId, values),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['collections', studentId] }),
        client.invalidateQueries({ queryKey: ['debts'] }),
        client.invalidateQueries({
          queryKey: ['payments', 'student-account', studentId],
        }),
      ])
    },
  })
}

export function useDebtAlerts() {
  return useQuery({
    queryKey: ['debt-alerts'],
    queryFn: getDebtAlerts,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useDownloadDebtsByClass() {
  return useMutation({
    mutationFn: (input: { params: DebtParams; format: 'pdf' | 'xlsx' }) =>
      downloadDebtsByClass(input.params, input.format),
  })
}
