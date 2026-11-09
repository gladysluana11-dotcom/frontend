import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createGuardian,
  createStudent,
  linkGuardian,
  searchGuardians,
  updateStudent,
  uploadStudentPhoto,
  type StudentChanges,
} from '../api/students-api'
import type {
  GuardianLinkValues,
  GuardianNewValues,
  StudentFormValues,
} from '../form-schemas'

/** Después de cambiar un alumno se vuelven a pedir a la API los datos que lo muestran. */
function useRefreshStudent() {
  const client = useQueryClient()
  return (id: number) =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['students', 'list'] }),
      client.invalidateQueries({ queryKey: ['students', 'detail', id] }),
      client.invalidateQueries({ queryKey: ['students', 'history', id] }),
      client.invalidateQueries({ queryKey: ['students', 'photo', id] }),
    ])
}

export function useCreateStudent() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (values: StudentFormValues) => createStudent(values),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ['students', 'list'] }),
  })
}

export function useUpdateStudent(id: number) {
  const refresh = useRefreshStudent()
  return useMutation({
    mutationFn: (changes: StudentChanges) => updateStudent(id, changes),
    onSuccess: () => refresh(id),
  })
}

export function useUploadStudentPhoto(id: number) {
  const refresh = useRefreshStudent()
  return useMutation({
    mutationFn: (file: File) => uploadStudentPhoto(id, file),
    onSuccess: () => refresh(id),
  })
}

export function useCreateGuardian(studentId: number) {
  const refresh = useRefreshStudent()
  return useMutation({
    mutationFn: (values: GuardianNewValues) =>
      createGuardian(studentId, values),
    onSuccess: () => refresh(studentId),
  })
}

export function useLinkGuardian(studentId: number) {
  const refresh = useRefreshStudent()
  return useMutation({
    mutationFn: (input: { guardianId: number; values: GuardianLinkValues }) =>
      linkGuardian(studentId, input.guardianId, input.values),
    onSuccess: () => refresh(studentId),
  })
}

export function useGuardianSearch(search: string) {
  return useQuery({
    queryKey: ['guardians', 'search', search],
    queryFn: () => searchGuardians(search),
    enabled: search.trim().length >= 2,
    gcTime: 60 * 1000,
  })
}
