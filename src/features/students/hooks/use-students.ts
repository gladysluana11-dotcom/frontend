import { keepPreviousData, useQuery } from '@tanstack/react-query'
import {
  getStudent,
  getStudentHistory,
  getStudentPhoto,
  listStudents,
  type StudentListParams,
} from '../api/students-api'

const ONE_MINUTE = 60 * 1000

export function useStudents(params: StudentListParams) {
  return useQuery({
    queryKey: ['students', 'list', params],
    queryFn: () => listStudents(params),
    placeholderData: keepPreviousData,
    gcTime: 5 * ONE_MINUTE,
  })
}

export function useStudent(id: number | undefined) {
  return useQuery({
    queryKey: ['students', 'detail', id],
    queryFn: () => getStudent(id as number),
    enabled: id !== undefined,
    gcTime: ONE_MINUTE,
  })
}

export function useStudentHistory(id: number | undefined) {
  return useQuery({
    queryKey: ['students', 'history', id],
    queryFn: () => getStudentHistory(id as number),
    enabled: id !== undefined,
    gcTime: ONE_MINUTE,
  })
}

export function useStudentPhoto(id: number | undefined, hasPhoto: boolean) {
  return useQuery({
    queryKey: ['students', 'photo', id],
    queryFn: () => getStudentPhoto(id as number),
    enabled: id !== undefined && hasPhoto,
    gcTime: ONE_MINUTE,
  })
}
