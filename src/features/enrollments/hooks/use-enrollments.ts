import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  changeEnrollmentSection,
  changeEnrollmentStatus,
  createEnrollment,
  createRequiredDocument,
  downloadEnrollmentFicha,
  getEnrollment,
  getEnrollmentStudent,
  listEnrollments,
  listRequiredDocuments,
  listStudentGuardians,
  searchEnrollmentStudents,
  updateEnrollmentDocument,
  updateRequiredDocument,
  type EnrollmentListParams,
} from '../api/enrollments-api'

const NO_CACHE = 0

export function useEnrollments(params: EnrollmentListParams) {
  return useQuery({
    queryKey: ['enrollments', 'list', params],
    queryFn: () => listEnrollments(params),
    placeholderData: keepPreviousData,
    gcTime: NO_CACHE,
  })
}

export function useEnrollment(id: number | undefined) {
  return useQuery({
    queryKey: ['enrollments', 'detail', id],
    queryFn: () => getEnrollment(id as number),
    enabled: id !== undefined,
    gcTime: NO_CACHE,
  })
}

export function useEnrollmentStudentSearch(search: string) {
  return useQuery({
    queryKey: ['enrollments', 'student-search', search],
    queryFn: () => searchEnrollmentStudents(search),
    enabled: search.trim().length >= 2,
    gcTime: NO_CACHE,
  })
}

export function useEnrollmentStudent(id: number | undefined) {
  return useQuery({
    queryKey: ['enrollments', 'student', id],
    queryFn: () => getEnrollmentStudent(id as number),
    enabled: id !== undefined,
    gcTime: NO_CACHE,
  })
}

export function useStudentGuardians(
  studentId: number | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: ['enrollments', 'student-guardians', studentId],
    queryFn: () => listStudentGuardians(studentId as number),
    enabled: studentId !== undefined && enabled,
    gcTime: NO_CACHE,
  })
}

export function useRequiredDocuments() {
  return useQuery({
    queryKey: ['enrollments', 'required-documents'],
    queryFn: listRequiredDocuments,
    gcTime: NO_CACHE,
  })
}

function useRefreshEnrollments(id?: number) {
  const client = useQueryClient()
  return async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: ['enrollments', 'list'] }),
      client.invalidateQueries({ queryKey: ['enrollments', 'detail'] }),
      client.invalidateQueries({ queryKey: ['students', 'detail'] }),
      ...(id
        ? [client.invalidateQueries({ queryKey: ['students', 'history', id] })]
        : []),
    ])
  }
}

export function useCreateEnrollment() {
  const refresh = useRefreshEnrollments()
  return useMutation({
    mutationFn: createEnrollment,
    onSuccess: refresh,
  })
}

export function useEnrollmentMutations(id: number) {
  const client = useQueryClient()
  const refresh = useRefreshEnrollments()
  return {
    changeStatus: useMutation({
      mutationFn: (values: Parameters<typeof changeEnrollmentStatus>[1]) =>
        changeEnrollmentStatus(id, values),
      onSuccess: refresh,
    }),
    changeSection: useMutation({
      mutationFn: (values: Parameters<typeof changeEnrollmentSection>[1]) =>
        changeEnrollmentSection(id, values),
      onSuccess: refresh,
    }),
    updateDocument: useMutation({
      mutationFn: (input: {
        documentId: number
        values: Parameters<typeof updateEnrollmentDocument>[1]
      }) => updateEnrollmentDocument(input.documentId, input.values),
      onSuccess: () =>
        client.invalidateQueries({ queryKey: ['enrollments', 'detail', id] }),
    }),
    downloadFicha: useMutation({ mutationFn: downloadEnrollmentFicha }),
  }
}

export function useRequiredDocumentMutations() {
  const client = useQueryClient()
  const refresh = () =>
    client.invalidateQueries({
      queryKey: ['enrollments', 'required-documents'],
    })
  return {
    create: useMutation({
      mutationFn: createRequiredDocument,
      onSuccess: refresh,
    }),
    update: useMutation({
      mutationFn: ({
        id,
        values,
      }: {
        id: number
        values: Parameters<typeof updateRequiredDocument>[1]
      }) => updateRequiredDocument(id, values),
      onSuccess: refresh,
    }),
  }
}
