import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../shared/api/errors'
import { getCurrentUser, type SessionUser } from '../api/auth-api'

export const sessionQueryKey = ['auth', 'me'] as const

export function useSession() {
  return useQuery<SessionUser | null>({
    queryKey: sessionQueryKey,
    queryFn: async () => {
      try {
        return await getCurrentUser()
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) return null
        throw error
      }
    },
    retry: (failureCount, error) =>
      !(error instanceof ApiError) && failureCount < 1,
    staleTime: 60 * 1000,
  })
}
