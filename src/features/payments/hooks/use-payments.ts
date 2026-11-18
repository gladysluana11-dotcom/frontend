import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  downloadPaymentReceipt,
  registerPayment,
  cancelPayment,
  downloadStudentAccount,
  getEnrollment,
  getPayment,
  getPaymentUser,
  getPaymentVoucher,
  getStudentAccount,
  listEnrollmentQuotas,
  listPayments,
  listStudentEnrollments,
  searchPaymentStudents,
  uploadPaymentVoucher,
  type PaymentListParams,
  type RegisterPaymentInput,
} from '../api/payments-api'

const MEMORY_CACHE_TIME = 0

export function usePayments(params: PaymentListParams) {
  return useQuery({
    queryKey: ['payments', 'list', params],
    queryFn: () => listPayments(params),
    placeholderData: keepPreviousData,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function usePaymentStudentSearch(search: string) {
  return useQuery({
    queryKey: ['payments', 'student-search', search],
    queryFn: () => searchPaymentStudents(search),
    enabled: search.trim().length >= 2,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useStudentEnrollments(studentId: number | undefined) {
  return useQuery({
    queryKey: ['payments', 'enrollments', studentId],
    queryFn: () => listStudentEnrollments(studentId as number),
    enabled: studentId !== undefined,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useEnrollment(id: number | undefined) {
  return useQuery({
    queryKey: ['enrollments', 'detail', id],
    queryFn: () => getEnrollment(id as number),
    enabled: id !== undefined,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useEnrollmentQuotas(id: number | undefined) {
  return useQuery({
    queryKey: ['payments', 'quotas', id],
    queryFn: () => listEnrollmentQuotas(id as number),
    enabled: id !== undefined,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function usePayment(id: number | undefined) {
  return useQuery({
    queryKey: ['payments', 'detail', id],
    queryFn: () => getPayment(id as number),
    enabled: id !== undefined,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function usePaymentUser(id: number | undefined) {
  return useQuery({
    queryKey: ['payments', 'user', id],
    queryFn: () => getPaymentUser(id as number),
    enabled: id !== undefined,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useRegisterPayment() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (input: { values: RegisterPaymentInput; key: string }) =>
      registerPayment(input.values, input.key),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payments', 'list'] }),
        client.invalidateQueries({ queryKey: ['payments', 'student-account'] }),
        client.invalidateQueries({ queryKey: ['payments', 'quotas'] }),
      ])
    },
  })
}

export function useDownloadPaymentReceipt() {
  return useMutation({
    mutationFn: (paymentId: number) => downloadPaymentReceipt(paymentId),
  })
}

export function useStudentAccount(id: number | undefined) {
  return useQuery({
    queryKey: ['payments', 'student-account', id],
    queryFn: () => getStudentAccount(id as number),
    enabled: id !== undefined,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function usePaymentVoucher(id: number | undefined, enabled: boolean) {
  return useQuery({
    queryKey: ['payments', 'voucher', id],
    queryFn: () => getPaymentVoucher(id as number),
    enabled: id !== undefined && enabled,
    gcTime: MEMORY_CACHE_TIME,
  })
}

export function useCancelPayment(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (values: { motivo: string }) => cancelPayment(id, values),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payments'] }),
        client.invalidateQueries({ queryKey: ['payments', 'student-account'] }),
        client.invalidateQueries({ queryKey: ['payments', 'quotas'] }),
      ])
    },
  })
}

export function useUploadPaymentVoucher(id: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (file: File) => uploadPaymentVoucher(id, file),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ['payments', 'detail', id] }),
        client.invalidateQueries({ queryKey: ['payments', 'voucher', id] }),
      ])
    },
  })
}

export function useDownloadStudentAccount() {
  return useMutation({
    mutationFn: (studentId: number) => downloadStudentAccount(studentId),
  })
}
