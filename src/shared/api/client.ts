import createClient from 'openapi-fetch'
import type { paths } from '../../api/schema'
import { normalizeApiError } from './errors'
import { texts } from '../texts'

const apiRoot = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '')

export const apiBaseUrl = `${apiRoot}/api`
export const accessTokenStorageKey = 'sge_access_token'

export function getAccessToken(): string | null {
  return localStorage.getItem(accessTokenStorageKey)
}

export function setAccessToken(token: string): void {
  localStorage.setItem(accessTokenStorageKey, token)
}

export function clearAccessToken(): void {
  localStorage.removeItem(accessTokenStorageKey)
}

/**
 * Sin `Accept: application/json`, Laravel trata un 401 como una visita de navegador y
 * intenta redirigir a una página de login (ruta inexistente en una API), lo que termina en 500.
 */
const jsonHeaders = { Accept: 'application/json' }

export const api = createClient<paths>({
  baseUrl: apiBaseUrl,
  headers: jsonHeaders,
})

api.use({
  onRequest: ({ request }) => {
    const token = getAccessToken()
    if (token) request.headers.set('Authorization', `Bearer ${token}`)
    return request
  },
  onResponse: ({ request, response }) => {
    if (response.status === 401) {
      const path = new URL(request.url).pathname
      if (!path.endsWith('/v1/auth/token')) {
        clearAccessToken()
      }
      if (
        !path.endsWith('/v1/auth/token') &&
        !path.endsWith('/v1/auth/logout')
      ) {
        window.dispatchEvent(new Event('sge:session-expired'))
      }
    }
    return response
  },
})

type ApiResult<T> = {
  data?: T
  error?: unknown
  response: Response
}

export async function executeApi<T>(
  request: () => Promise<ApiResult<T>>,
): Promise<T> {
  try {
    const result = await request()
    if (!result.response.ok) {
      throw normalizeApiError(result.error, result.response.status)
    }
    if (result.data === undefined) {
      throw normalizeApiError(
        { message: texts.errors.emptyResponse },
        result.response.status,
      )
    }
    return result.data
  } catch (error) {
    throw normalizeApiError(error)
  }
}
