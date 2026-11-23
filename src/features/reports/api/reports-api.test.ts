import { afterEach, describe, expect, it, vi } from 'vitest'

async function loadApi(
  respond: (request: Request) => Promise<Response> | Response,
) {
  const requests: Request[] = []
  vi.resetModules()
  localStorage.setItem('sge_access_token', 'token-de-prueba')
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(input, init)
      requests.push(request.clone())
      return respond(request)
    }),
  )
  const api = await import('./reports-api')
  return { api, requests }
}

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('reports API', () => {
  it('loads reports with validated filters and normalized money', async () => {
    const { api, requests } = await loadApi((request) => {
      if (request.url.includes('/v1/reportes/pagos')) {
        return jsonResponse({
          data: {
            resumen: { cantidad: 1, total_vigente: '75.50' },
            filas: [
              {
                pago_id: 8,
                fecha_pago: '2026-03-20',
                alumno: 'Lucía Torres',
                usuario: 'Ana',
                medio: 'transferencia',
                monto: '75.50',
                estado: 'vigente',
                constancia: 'B001-0008',
              },
            ],
            filtros: {},
          },
        })
      }
      return jsonResponse({
        data: {
          resumen: { total_emitido: '200.00', total_cobrado: '75.50' },
          filas: [
            {
              mes: '2026-03',
              cuotas_emitidas: '200.00',
              cuotas_cobradas: '75.50',
            },
          ],
          filtros: {},
        },
      })
    })

    const payments = await api.getPaymentReport({
      desde: '2026-03-01',
      hasta: '2026-03-31',
      medio: 'transferencia',
      usuarioId: 3,
    })
    const income = await api.getMonthlyIncomeReport({})

    expect(payments.resumen.total_vigente).toBe(75.5)
    expect(income.filas[0]?.cuotas_cobradas).toBe(75.5)
    const request = requests.find((item) =>
      item.url.includes('/v1/reportes/pagos'),
    )
    expect(request?.url).toContain('desde=2026-03-01')
    expect(request?.url).toContain('medio=transferencia')
    expect(request?.url).toContain('usuario_id=3')
  })

  it('downloads Excel using the authenticated API client and report filters', async () => {
    vi.useFakeTimers()
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:report-file')
    const revokeUrl = vi
      .spyOn(URL, 'revokeObjectURL')
      .mockImplementation(() => {})
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const { api, requests } = await loadApi(
      () => new Response(new Blob(['xlsx']), { status: 200 }),
    )

    await api.downloadReport(
      'pagos',
      { desde: '2026-01-01', hasta: '2026-01-31', usuarioId: 4 },
      'xlsx',
    )

    const request = requests.find((item) =>
      item.url.includes('/v1/reportes/pagos'),
    )
    expect(request?.url).toContain('formato=xlsx')
    expect(request?.url).toContain('usuario_id=4')
    expect(request?.headers.get('accept')).toBe('application/json')
    expect(createUrl).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    vi.runAllTimers()
    expect(revokeUrl).toHaveBeenCalledWith('blob:report-file')
  })

  it('loads the dashboard only from its documented endpoint', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({
        data: {
          resumen: {
            matriculados_por_nivel: [
              { nivel_id: 1, nivel: 'Primaria', matriculados: 24 },
            ],
            recaudacion_mes: '500.00',
            deuda_total: '900.00',
            deuda_vencida: '200.00',
            porcentaje_morosidad: '20.00',
          },
          filas: [{ nivel_id: 1, nivel: 'Primaria', matriculados: 24 }],
          filtros: { mes: '2026-11' },
        },
      }),
    )

    const dashboard = await api.getDirectorDashboard()

    expect(dashboard.resumen.deuda_total).toBe(900)
    expect(dashboard.resumen.matriculados_por_nivel[0]?.matriculados).toBe(24)
    expect(requests[0]?.url).toContain('/v1/reportes/dashboard')
  })
})
