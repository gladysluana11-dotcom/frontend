import { afterEach, describe, expect, it, vi } from 'vitest'

const payment = {
  id: 8,
  matricula_id: 2,
  alumno_id: 4,
  usuario_id: 1,
  fecha_pago: '2026-03-02',
  monto: '250.00',
  medio: 'efectivo',
  numero_operacion: null,
  observacion: null,
  estado: 'vigente',
  constancia: 'B001-0008',
  anulada_en: null,
  motivo_anulacion: null,
  voucher_disponible: false,
}

const registrationResponse = {
  message: 'Pago registrado.',
  data: {
    pago: payment,
    saldos: [{ cuota_id: 20, saldo: '100.00', estado: 'parcial' }],
    constancia: { numero: 'B001-0008', url: '/v1/pagos/8/constancia' },
  },
  errors: null,
  code: 'OK',
}

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
      if (request.url.includes('/sanctum/csrf-cookie')) {
        return new Response(null, { status: 204 })
      }
      return respond(request)
    }),
  )
  document.cookie = 'XSRF-TOKEN=csrf-token; path=/'
  const api = await import('./payments-api')
  return { api, requests }
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const registerInput = {
  matricula_id: 2,
  fecha_pago: '2026-03-02',
  monto: '250.00',
  medio: 'efectivo' as const,
  numero_operacion: '',
  observacion: '',
  modo_aplicacion: 'automatica' as const,
  aplicaciones: [],
}

describe('payments API', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    document.cookie = 'XSRF-TOKEN=; Max-Age=0; path=/'
  })

  it('envía Idempotency-Key, X-XSRF-TOKEN y Accept al registrar', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse(registrationResponse, 201),
    )

    await api.registerPayment(registerInput, 'stable-key')

    const request = requests.find(
      (item) => item.method === 'POST' && item.url.endsWith('/v1/pagos'),
    )
    expect(request).toBeDefined()
    expect(request?.headers.get('idempotency-key')).toBe('stable-key')
    expect(request?.headers.get('x-xsrf-token')).toBe('csrf-token')
    expect(request?.headers.get('accept')).toBe('application/json')
    const bodyText = await request?.clone().text()
    expect(bodyText).toContain('"monto":250.00')
    expect(await request?.clone().json()).toMatchObject({
      matricula_id: 2,
      monto: 250,
      medio: 'efectivo',
    })
  })

  it('serializa las aplicaciones manuales con dos decimales', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse(registrationResponse, 201),
    )

    await api.registerPayment(
      {
        ...registerInput,
        modo_aplicacion: 'manual',
        aplicaciones: [{ cuota_id: 20, monto: '10.50' }],
      },
      'manual-key',
    )

    const request = requests.find(
      (item) => item.method === 'POST' && item.url.endsWith('/v1/pagos'),
    )
    const body = await request?.clone().text()
    expect(body).toContain('"monto":250.00')
    expect(body).toContain('"monto":10.50')
  })

  it('aplica los filtros de URL del listado y valida su respuesta', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({
        data: {
          pagos: [payment],
          paginacion: {
            pagina: 2,
            por_pagina: 25,
            total: 26,
            ultima_pagina: 2,
            siguiente: null,
            anterior: 'https://example.test?page=1',
          },
        },
      }),
    )

    const result = await api.listPayments({
      page: 2,
      perPage: 25,
      studentId: 4,
      desde: '2026-03-01',
      hasta: '2026-03-31',
      medio: 'efectivo',
      estado: 'vigente',
      sort: 'fecha_pago',
      direction: 'desc',
    })

    const request = requests.find((item) => item.url.includes('/v1/pagos?'))
    const query = new URL(request?.url ?? 'https://example.test').searchParams
    expect(query.get('alumno_id')).toBe('4')
    expect(query.get('desde')).toBe('2026-03-01')
    expect(query.get('hasta')).toBe('2026-03-31')
    expect(query.get('medio')).toBe('efectivo')
    expect(query.get('estado')).toBe('vigente')
    expect(query.get('sort')).toBe('fecha_pago')
    expect(query.get('direction')).toBe('desc')
    expect(result.items[0]?.monto).toBe(250)
    expect(result.pagination.page).toBe(2)
  })

  it('busca alumnos, matrículas y cuotas mediante los parámetros del contrato', async () => {
    const quota = {
      id: 20,
      matricula_id: 2,
      alumno_id: 4,
      concepto: 'pension',
      numero: 1,
      descripcion: 'Pensión 1',
      monto_original: '250.00',
      vencimiento: '2026-03-10',
      anulada_en: null,
      saldo: '100.00',
      total_descuentos: '0.00',
      total_pagos: '150.00',
      estado: 'parcial',
    }
    const { api, requests } = await loadApi((request) => {
      if (request.url.includes('/v1/alumnos?')) {
        return jsonResponse({
          data: {
            alumnos: [{ id: 4, nombre: 'Samuel', apellido: 'Aguilar' }],
            paginacion: {
              pagina: 1,
              por_pagina: 10,
              total: 1,
              ultima_pagina: 1,
            },
          },
        })
      }
      if (request.url.includes('/v1/matriculas?')) {
        return jsonResponse({
          data: {
            matriculas: [{ id: 2, alumno_id: 4, anio_escolar_id: 2026 }],
            paginacion: {
              pagina: 1,
              por_pagina: 100,
              total: 1,
              ultima_pagina: 1,
            },
          },
        })
      }
      return jsonResponse({
        data: {
          cuotas: [quota],
          paginacion: {
            pagina: 1,
            por_pagina: 100,
            total: 1,
            ultima_pagina: 1,
          },
        },
      })
    })

    const students = await api.searchPaymentStudents('Samuel')
    const enrollments = await api.listStudentEnrollments(4)
    const quotas = await api.listEnrollmentQuotas(2)

    expect(students.items[0]?.nombre).toBe('Samuel')
    expect(enrollments.items[0]?.id).toBe(2)
    expect(quotas.items[0]?.saldo).toBe(100)
    expect(requests[0]?.url).toContain('buscar=Samuel')
    expect(requests[1]?.url).toContain('alumno_id=4')
    expect(requests[2]?.url).toContain('/v1/matriculas/2/cuotas')
  })

  it('obtiene y valida el nombre del usuario desde la API', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({
        data: {
          usuario: [{ id: 1, nombre: 'Elena', apellido: 'Torres' }],
        },
      }),
    )

    const user = await api.getPaymentUser(1)

    expect(user.nombre).toBe('Elena')
    expect(requests[0]?.url).toContain('/v1/usuarios/1')
  })

  it.each([
    [409, 'Conflicto'],
    [429, 'Espera un momento'],
  ])('normaliza el error HTTP %s', async (status, message) => {
    const { api } = await loadApi(() =>
      jsonResponse(
        { message, data: null, errors: null, code: 'ERROR' },
        status,
      ),
    )

    await expect(
      api.registerPayment(registerInput, 'stable-key'),
    ).rejects.toMatchObject({ status })
  })

  it('envía el motivo obligatorio para anular y valida la respuesta', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({
        data: {
          pago: {
            ...payment,
            estado: 'anulado',
            motivo_anulacion: 'Registro duplicado',
          },
          saldos: [{ cuota_id: 20, saldo: '250.00', estado: 'pendiente' }],
        },
      }),
    )

    const result = await api.cancelPayment(8, {
      motivo: 'Registro duplicado',
    })
    const request = requests.find((item) => item.url.endsWith('/anular'))

    expect(result.estado).toBe('anulado')
    expect(await request?.clone().json()).toEqual({
      motivo: 'Registro duplicado',
    })
    expect(request?.headers.get('x-xsrf-token')).toBe('csrf-token')
  })

  it('sube un voucher como multipart y valida el pago devuelto', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({
        data: { pago: { ...payment, voucher_disponible: true } },
      }),
    )
    const file = new File(['voucher'], 'voucher.pdf', {
      type: 'application/pdf',
    })

    const result = await api.uploadPaymentVoucher(8, file)
    const request = requests.find((item) => item.url.endsWith('/voucher'))
    const body = await request?.clone().text()

    expect(result.voucher_disponible).toBe(true)
    expect(body).toContain('name="voucher"')
    expect(body).toContain('Content-Type: application/pdf')
    expect(request?.headers.get('x-xsrf-token')).toBe('csrf-token')
  })

  it('valida la respuesta y normaliza los totales del estado de cuenta', async () => {
    const { api } = await loadApi(() =>
      jsonResponse({
        data: {
          alumno: { id: 4, nombre: 'Ana', apellido: 'Torres' },
          cuotas: [],
          pagos: [],
          totales: {
            emitido: '300.00',
            pagado: '250.00',
            saldo: '50.00',
            vencido: '0.00',
          },
        },
      }),
    )

    const account = await api.getStudentAccount(4)
    expect(account.totales).toEqual({
      emitido: 300,
      pagado: 250,
      saldo: 50,
      vencido: 0,
    })
  })

  it('descarga una constancia PDF mediante el cliente autenticado', async () => {
    const { api, requests } = await loadApi(
      () =>
        new Response(new Uint8Array([37, 80, 68, 70]), {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
    )
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:receipt')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})

    await api.downloadPaymentReceipt(8)

    expect(requests[0]?.url).toContain('/v1/pagos/8/constancia')
    expect(requests[0]?.headers.get('accept')).toBe('application/json')
    expect(createUrl).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
  })

  it('descarga el PDF del estado de cuenta desde el endpoint autenticado', async () => {
    const requests: Request[] = []
    vi.resetModules()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const request =
          input instanceof Request ? input : new Request(input, init)
        requests.push(request.clone())
        return new Response(new Uint8Array([37, 80, 68, 70]), {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        })
      }),
    )
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:account')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const api = await import('./payments-api')

    await api.downloadStudentAccount(4)

    expect(requests[0]?.url).toContain('/v1/alumnos/4/estado-cuenta/pdf')
    expect(requests[0]?.headers.get('accept')).toBe('application/json')
    expect(createUrl).toHaveBeenCalledOnce()
  })
})
