import type { paths } from '../../../api/schema'
import { api, executeApi } from '../../../shared/api/client'
import { getLoginSubdomain } from '../../../shared/utils/subdomain'

type UserResponse =
  paths['/v1/auth/me']['get']['responses'][200]['content']['application/json']

export type SessionUser = UserResponse['data']['usuario']

type LoginRequest = {
  email: string
  password: string
}

type LoginBody = LoginRequest & { subdominio?: string }

/** Arma el cuerpo del login; agrega el subdominio solo cuando corresponde (desarrollo). */
export function buildLoginBody(
  credentials: LoginRequest,
  subdomain: string | undefined,
): LoginBody {
  return subdomain
    ? { ...credentials, subdominio: subdomain }
    : { ...credentials }
}

export async function login(credentials: LoginRequest): Promise<SessionUser> {
  const body = buildLoginBody(credentials, getLoginSubdomain())
  const response = await executeApi(() => api.POST('/v1/auth/login', { body }))
  return response.data.usuario
}

export async function getCurrentUser(): Promise<SessionUser> {
  const response = await executeApi(() => api.GET('/v1/auth/me'))
  return response.data.usuario
}

export async function logout(): Promise<void> {
  await executeApi(() => api.POST('/v1/auth/logout'))
}

export async function requestPasswordReset(email: string): Promise<void> {
  await executeApi(() =>
    api.POST('/v1/auth/recuperar-contrasena', { body: { email } }),
  )
}

export async function resetPassword(input: {
  token: string
  email: string
  password: string
  password_confirmation: string
}): Promise<void> {
  await executeApi(() =>
    api.POST('/v1/auth/restablecer-contrasena', { body: input }),
  )
}

export async function changePassword(input: {
  contrasena_actual: string
  contrasena: string
  contrasena_confirmation: string
}): Promise<SessionUser> {
  const response = await executeApi(() =>
    api.POST('/v1/auth/cambiar-contrasena', { body: input }),
  )
  return response.data.usuario
}
