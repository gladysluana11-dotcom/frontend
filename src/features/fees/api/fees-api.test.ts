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
  const api = await import('./fees-api')
  return { api, requests }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const pagination = {
  pagina: 1,
  por_pagina: 25,
  total: 1,
  ultima_pagina: 1,
  siguiente: null,
  anterior: null,
}

const tariff = {
  id: 8,
  anio_escolar_id: 2026,
  grado_id: 3,
  grado: 'Primero',
  monto_matricula: '250.00',
  monto_pension: '180.50',
  numero_cuotas: 10,
  dia_vencimiento: 28,
  mes_primera_pension: 3,
}

const discount = {
  id: 12,
  cuota_id: 20,
  tipo: 'beca',
  modo: 'porcentaje',
  valor: '25.00',
  monto_calculado: '45.13',
  motivo: 'Apoyo escolar',
  usuario_id: 1,
  anulada_en: null,
  motivo_anulacion: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  localStorage.clear()
})

describe('fees API', () => {
  it('obtiene y valida tarifas y catálogos con filtros del contrato', async () => {
    const { api, requests } = await loadApi((request) => {
      if (request.url.includes('/v1/tarifas?')) {
        return jsonResponse({
          data: { tarifas: [tariff], paginacion: pagination },
        })
      }
      if (request.url.includes('/v1/anios-escolares')) {
        return jsonResponse({
          data: {
            anios_escolares: [
              { id: 2026, nombre: '2026', cerrado: false, activo: true },
            ],
            paginacion: pagination,
          },
        })
      }
      if (request.url.includes('/v1/niveles')) {
        return jsonResponse({
          data: {
            niveles: [{ id: 2, nombre: 'Primaria' }],
            paginacion: pagination,
          },
        })
      }
      return jsonResponse({
        data: {
          grados: [
            { id: 3, nivel_id: 2, nombre: 'Primero', nivel: 'Primaria' },
          ],
          paginacion: pagination,
        },
      })
    })

    const tariffs = await api.listTariffs({
      page: 1,
      perPage: 25,
      search: 'Primero',
      academicYearId: 2026,
      gradeId: 3,
    })
    const years = await api.listAcademicYears()
    const levels = await api.listAcademicLevels()
    const grades = await api.listGrades()

    expect(tariffs.items[0]?.monto_pension).toBe(180.5)
    expect(years.items[0]?.cerrado).toBe(false)
    expect(levels.items[0]?.nombre).toBe('Primaria')
    expect(grades.items[0]?.nivel_id).toBe(2)
    const tariffQuery = new URL(
      requests.find((request) => request.url.includes('/v1/tarifas?'))?.url ??
        'https://example.test',
    ).searchParams
    expect(tariffQuery.get('anio_escolar_id')).toBe('2026')
    expect(tariffQuery.get('grado_id')).toBe('3')
    expect(tariffQuery.get('buscar')).toBe('Primero')
  })

  it('serializa montos de tarifa con dos decimales y valida la respuesta', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({ data: { tarifa: tariff }, errors: null, code: 'OK' }, 201),
    )

    const values = {
      anio_escolar_id: '2026',
      grado_id: '3',
      monto_matricula: '0',
      monto_pension: '180.5',
      numero_cuotas: '10',
      dia_vencimiento: '28',
      mes_primera_pension: '3',
    }
    await api.createTariff(values)
    await api.updateTariff(8, values)

    const request = requests.find(
      (item) => item.method === 'POST' && item.url.endsWith('/v1/tarifas'),
    )
    expect(request?.headers.get('accept')).toBe('application/json')
    expect(request?.headers.get('authorization')).toBe('Bearer token-de-prueba')
    expect(await request?.clone().text()).toContain('"monto_matricula":0.00')
    expect(await request?.clone().text()).toContain('"monto_pension":180.50')
    const update = requests.find(
      (item) => item.method === 'PUT' && item.url.endsWith('/v1/tarifas/8'),
    )
    expect(await update?.clone().text()).toContain('"monto_pension":180.50')
  })

  it('genera cuotas con la misma clave idempotente y valida la colección', async () => {
    const quota = {
      id: 20,
      matricula_id: 2,
      alumno_id: 4,
      concepto: 'pension',
      numero: 1,
      descripcion: 'Pensión 1',
      monto_original: '180.50',
      vencimiento: '2026-03-10',
      anulada_en: null,
      saldo: '180.50',
      total_descuentos: '0.00',
      total_pagos: '0.00',
      estado: 'pendiente',
    }
    const { api, requests } = await loadApi(() =>
      jsonResponse({ data: { cuotas: [quota] } }),
    )

    const result = await api.generateEnrollmentQuotas(2, 'quota-key')

    expect(result[0]?.saldo).toBe(180.5)
    const request = requests.find((item) =>
      item.url.endsWith('/v1/matriculas/2/generar-cuotas'),
    )
    expect(request?.headers.get('idempotency-key')).toBe('quota-key')
    expect(request?.headers.get('authorization')).toBe('Bearer token-de-prueba')
  })

  it('registra y anula descuentos con validación y cabecera idempotente', async () => {
    const { api, requests } = await loadApi((request) =>
      request.url.includes('/v1/matriculas/2/descuentos')
        ? jsonResponse({
            data: { descuentos: [discount] },
            errors: null,
            code: 'OK',
          })
        : jsonResponse({
            data: { descuento: discount },
            errors: null,
            code: 'OK',
          }),
    )

    const created = await api.createQuotaDiscount(
      20,
      {
        tipo: 'beca',
        modo: 'porcentaje',
        valor: '25',
        motivo: 'Apoyo escolar',
      },
      'discount-key',
    )
    expect(created.monto_calculado).toBe(45.13)

    const enrollmentDiscounts = await api.createEnrollmentDiscounts(
      2,
      {
        tipo: 'beca',
        modo: 'porcentaje',
        valor: '25',
        motivo: 'Apoyo escolar',
      },
      'enrollment-discount-key',
    )
    expect(enrollmentDiscounts[0]?.id).toBe(12)

    const canceled = await api.cancelDiscount(
      12,
      { motivo: 'Solicitud revisada' },
      'cancel-key',
    )
    expect(canceled.id).toBe(12)
    const writes = requests.filter((request) => request.method === 'POST')
    expect(writes[0]?.headers.get('idempotency-key')).toBe('discount-key')
    expect(writes[1]?.headers.get('idempotency-key')).toBe(
      'enrollment-discount-key',
    )
    expect(writes[2]?.headers.get('idempotency-key')).toBe('cancel-key')
    expect(writes[0]?.headers.get('accept')).toBe('application/json')
    expect(writes[0]?.headers.get('authorization')).toBe(
      'Bearer token-de-prueba',
    )
  })

  it('consulta resumen de caja y envía el cierre de la fecha seleccionada', async () => {
    const { api, requests } = await loadApi((request) => {
      if (request.method === 'GET') {
        return jsonResponse({
          data: {
            fecha: '2026-03-10',
            total: '430.50',
            cantidad_pagos: 2,
            por_usuario: [
              {
                usuario_id: 1,
                usuario: 'Elena',
                cantidad: 2,
                total: '430.50',
              },
            ],
            por_medio: [{ medio: 'efectivo', cantidad: 2, total: '430.50' }],
          },
        })
      }
      return jsonResponse({
        data: {
          cierre: {
            id: 3,
            fecha: '2026-03-10',
            observacion: 'Revisado',
            total: '430.50',
            resumen: [],
            usuario_id: 1,
          },
        },
      })
    })

    const summary = await api.getCashSummary('2026-03-10')
    const closure = await api.closeCashBox({
      fecha: '2026-03-10',
      observacion: 'Revisado',
      idempotencyKey: 'cash-key',
    })

    expect(summary.total).toBe(430.5)
    expect(closure.usuario_id).toBe(1)
    expect(requests[0]?.url).toContain('fecha=2026-03-10')
    const closeRequest = requests.find(
      (request) =>
        request.method === 'POST' && request.url.endsWith('/v1/caja/cierres'),
    )
    expect(closeRequest?.headers.get('idempotency-key')).toBe('cash-key')
  })
})
