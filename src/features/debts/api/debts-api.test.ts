import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadApi(
  respond: (request: Request) => Promise<Response> | Response,
) {
  const requests: Request[] = []
  vi.resetModules()
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(input, init)
      requests.push(request.clone())
      return respond(request)
    }),
  )
  localStorage.setItem('sge_access_token', 'token-de-prueba')
  const api = await import('./debts-api')
  return { api, requests }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const debt = {
  alumno_id: 7,
  nombre: 'Lucía',
  apellido: 'Torres',
  nivel: 'Primaria',
  grado: 'Segundo',
  seccion: 'B',
  total_vencido: '120.50',
  total_pendiente: '250.00',
  cuotas_vencidas: 1,
  dias_atraso: 12,
  apoderado_responsable_pago: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
  localStorage.clear()
})

describe('debts API', () => {
  it('sends debt filters and pagination through the authenticated API client', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({
        data: {
          deudas: [debt],
          paginacion: {
            pagina: 2,
            por_pagina: 25,
            total: 26,
            ultima_pagina: 2,
          },
        },
      }),
    )

    const result = await api.listDebts({
      page: 2,
      perPage: 25,
      nivelId: 2,
      diasAtrasoMin: 10,
      montoMin: 100,
      buscar: 'Lucía',
    })

    const request = requests.find((item) => item.url.includes('/v1/deudas?'))
    expect(result.items[0]?.total_vencido).toBe(120.5)
    expect(result.pagination.page).toBe(2)
    expect(request?.url).toContain('nivel_id=2')
    expect(request?.url).toContain('dias_atraso_min=10')
    expect(request?.url).toContain('monto_min=100')
    expect(request?.url).toContain('buscar=Luc%C3%ADa')
    expect(request?.headers.get('accept')).toBe('application/json')
  })

  it('posts collection data with CSRF and a two-decimal commitment amount', async () => {
    const collection = {
      id: 17,
      alumno_id: 7,
      usuario_id: 1,
      usuario: 'Ana Torres',
      fecha: '2026-11-14',
      medio_contacto: 'whatsapp',
      resultado: 'Recordatorio enviado',
      compromiso_pago_fecha: '2026-11-20',
      compromiso_monto: '45.50',
      observacion: null,
    }
    const { api, requests } = await loadApi(() =>
      jsonResponse({ data: { gestion: collection } }, 201),
    )

    const result = await api.createCollection(7, {
      fecha: '2026-11-14',
      medio_contacto: 'whatsapp',
      resultado: 'Recordatorio enviado',
      compromiso_pago_fecha: '2026-11-20',
      compromiso_monto: '45.50',
      observacion: '',
    })

    const request = requests.find(
      (item) =>
        item.method === 'POST' && item.url.includes('/gestiones-cobranza'),
    )
    expect(result.compromiso_monto).toBe(45.5)
    expect(request?.url).toContain('/v1/alumnos/7/gestiones-cobranza')
    expect(request?.headers.get('authorization')).toBe('Bearer token-de-prueba')
    expect(request?.headers.get('accept')).toBe('application/json')
    expect(await request?.clone().text()).toContain('"compromiso_monto":45.50')
  })

  it('downloads the classroom report through the authenticated blob request', async () => {
    vi.useFakeTimers()
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:class-report')
    const revokeUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const { api, requests } = await loadApi(
      () => new Response(new Blob(['report']), { status: 200 }),
    )

    await api.downloadDebtsByClass({ page: 1, perPage: 25, nivelId: 2 }, 'xlsx')

    const request = requests.find((item) =>
      item.url.includes('/v1/deudas/por-aula?'),
    )
    expect(request?.url).toContain('formato=xlsx')
    expect(request?.url).toContain('nivel_id=2')
    expect(request?.headers.get('accept')).toBe('application/json')
    expect(createUrl).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(revokeUrl).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(revokeUrl).toHaveBeenCalledWith('blob:class-report')
  })
})
