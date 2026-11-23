import { afterEach, describe, expect, it, vi } from 'vitest'

describe('cliente de la API', () => {
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('envía respuestas JSON y el token Bearer sin credenciales de cookie', async () => {
    const requests: Request[] = []
    const fetchMock = vi.fn(async (request: Request) => {
      requests.push(request)
      return new Response(
        JSON.stringify({
          message: 'No autenticado.',
          data: null,
          errors: null,
          code: 'UNAUTHENTICATED',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } },
      )
    })
    localStorage.setItem('sge_access_token', 'token-de-prueba')
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    const { api } = await import('./client')

    await api.GET('/v1/auth/me')

    expect(requests[0]?.headers.get('accept')).toBe('application/json')
    expect(requests[0]?.headers.get('authorization')).toBe(
      'Bearer token-de-prueba',
    )
    expect(requests[0]?.credentials).toBe('same-origin')
  })

  it('elimina el token y notifica cuando /auth/me devuelve 401', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            message: 'No autenticado.',
            data: null,
            errors: null,
            code: 'UNAUTHENTICATED',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } },
        ),
    )
    const onExpired = vi.fn()
    localStorage.setItem('sge_access_token', 'token-vencido')
    window.addEventListener('sge:session-expired', onExpired)
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    const { api } = await import('./client')

    await api.GET('/v1/auth/me')

    expect(localStorage.getItem('sge_access_token')).toBeNull()
    expect(onExpired).toHaveBeenCalledOnce()
    window.removeEventListener('sge:session-expired', onExpired)
  })
})
