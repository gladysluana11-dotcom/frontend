import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '../shared/api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) =>
        !(error instanceof ApiError) && failureCount < 1,
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: false,
    },
  },
})
