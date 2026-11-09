import { useQuery } from '@tanstack/react-query'
import {
  listAcademicYears,
  listGrades,
  listLevels,
  listSections,
} from '../api/catalog-api'

const FIVE_MINUTES = 5 * 60 * 1000

export function useAcademicYears() {
  return useQuery({
    queryKey: ['catalog', 'academic-years'],
    queryFn: listAcademicYears,
    staleTime: FIVE_MINUTES,
  })
}

export function useLevels() {
  return useQuery({
    queryKey: ['catalog', 'levels'],
    queryFn: listLevels,
    staleTime: FIVE_MINUTES,
  })
}

export function useGrades() {
  return useQuery({
    queryKey: ['catalog', 'grades'],
    queryFn: listGrades,
    staleTime: FIVE_MINUTES,
  })
}

export function useSections() {
  return useQuery({
    queryKey: ['catalog', 'sections'],
    queryFn: listSections,
    staleTime: FIVE_MINUTES,
  })
}
