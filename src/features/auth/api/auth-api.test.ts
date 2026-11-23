import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildLoginBody } from './auth-api'

const credentials = { email: 'ana@example.com', password: 'Password123!' }

describe('buildLoginBody', () => {
  it('agrega el subdominio cuando se indica (desarrollo)', () => {
    expect(buildLoginBody(credentials, 'salesian-innova')).toEqual({
      ...credentials,
      subdominio: 'salesian-innova',
    })
  })

  describe('autenticación con token', () => {
    afterEach(() => {
      localStorage.clear()
      vi.unstubAllGlobals()
      vi.resetModules()
    })

    it('inicia sesión con /auth/token, reutiliza el Bearer y lo elimina al cerrar sesión', async () => {
      const user = {
        id: 1,
        nombre: 'Ana',
        apellido: 'Torres',
        email: credentials.email,
        colegio_id: 1,
        roles: {},
        requiere_cambio_contrasena: false,
      }
      const requests: Request[] = []
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
          const request =
            input instanceof Request ? input : new Request(input, init)
          requests.push(request.clone())
          const path = new URL(request.url).pathname
          const data = path.endsWith('/auth/token')
            ? { usuario: user, token: 'token-de-prueba' }
            : path.endsWith('/auth/me')
              ? { usuario: user }
              : null
          return new Response(
            JSON.stringify({
              message: 'Correcto.',
              data,
              errors: null,
              code: 'OK',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          )
        }),
      )
      vi.resetModules()
      const { login, getCurrentUser, logout } = await import('./auth-api')

      await expect(login(credentials)).resolves.toEqual(user)
      expect(new URL(requests[0]?.url ?? '').pathname).toBe(
        '/api/v1/auth/token',
      )
      expect(await requests[0]?.clone().json()).toMatchObject(credentials)
      expect(localStorage.getItem('sge_access_token')).toBe('token-de-prueba')

      await getCurrentUser()
      expect(requests[1]?.headers.get('authorization')).toBe(
        'Bearer token-de-prueba',
      )

      await logout()
      expect(requests[2]?.headers.get('authorization')).toBe(
        'Bearer token-de-prueba',
      )
      expect(localStorage.getItem('sge_access_token')).toBeNull()
    })
  })

  it('no agrega el subdominio cuando no corresponde (producción)', () => {
    expect(buildLoginBody(credentials, undefined)).toEqual(credentials)
  })
})
