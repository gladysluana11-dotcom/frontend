import createClient from 'openapi-fetch'
import type { paths } from '../../api/schema'
import { normalizeApiError } from './errors'
import { texts } from '../texts'

type LoginRequest = {
  email: string
  password: string
  subdominio?: string
}

type LoginOperation = Omit<paths['/v1/auth/login']['post'], 'requestBody'> & {
  requestBody: {
    content: {
      'application/json': LoginRequest
    }
  }
}

export type ApiPaths = Omit<paths, '/v1/auth/login'> & {
  '/v1/auth/login': Omit<paths['/v1/auth/login'], 'post'> & {
    post: LoginOperation
  }
}

const apiRoot = (
  import.meta.env.VITE_API_URL || 'http://localhost:8000'
).replace(/\/+$/, '')

export const apiBaseUrl = `${apiRoot}/api`

let csrfRequest: Promise<void> | undefined

function readCsrfToken(): string | undefined {
  const cookie = document.cookie
    .split('; ')
    .find((entry) => entry.startsWith('XSRF-TOKEN='))
  if (!cookie) return undefined

  return decodeURIComponent(cookie.slice('XSRF-TOKEN='.length))
}

async function ensureCsrfCookie(): Promise<void> {
  if (!csrfRequest) {
    csrfRequest = fetch(`${apiRoot}/sanctum/csrf-cookie`, {
      credentials: 'include',
      headers: jsonHeaders,
    })
      .then((response) => {
        if (!response.ok) {
          throw normalizeApiError(
            { message: texts.errors.csrf },
            response.status,
          )
        }
      })
      .catch((error: unknown) => {
        csrfRequest = undefined
        throw normalizeApiError(error)
      })
  }

  await csrfRequest
}

/**
 * Sin `Accept: application/json`, Laravel trata un 401 como una visita de navegador y
 * intenta redirigir a una página de login (ruta inexistente en una API), lo que termina en 500.
 */
const jsonHeaders = { Accept: 'application/json' }

export const api = createClient<ApiPaths>({
  baseUrl: apiBaseUrl,
  credentials: 'include',
  headers: jsonHeaders,
})

api.use({
  onRequest: async ({ request }) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method.toUpperCase())) {
      await ensureCsrfCookie()
      let token = readCsrfToken()
      if (!token) {
        csrfRequest = undefined
        await ensureCsrfCookie()
        token = readCsrfToken()
      }
      if (!token) {
        csrfRequest = undefined
        throw normalizeApiError({ message: texts.errors.csrf }, 419)
      }
      request.headers.set('X-XSRF-TOKEN', token)
    }
    return request
  },
  onResponse: ({ request, response }) => {
    if (response.status === 401) {
      const path = new URL(request.url).pathname
      const isAuthBootstrap =
        path.endsWith('/v1/auth/login') ||
        path.endsWith('/v1/auth/me') ||
        path.endsWith('/v1/auth/logout')
      if (!isAuthBootstrap) {
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
