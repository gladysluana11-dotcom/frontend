import { afterEach, describe, expect, it, vi } from 'vitest'

describe('cliente de la API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('pide siempre respuestas JSON para que Laravel devuelva 401 y no intente redirigir', async () => {
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
    vi.stubGlobal('fetch', fetchMock)
    vi.resetModules()
    const { api } = await import('./client')

    await api.GET('/v1/auth/me')

    expect(requests[0]?.headers.get('accept')).toBe('application/json')
  })
})
