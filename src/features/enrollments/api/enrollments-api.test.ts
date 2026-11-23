import { afterEach, describe, expect, it, vi } from 'vitest'

const enrollment = {
  id: 18,
  alumno: { id: 18, nombre: 'Samuel', apellido: 'Aguilar' },
  anio_escolar_id: 1,
  anio_escolar: '2026',
  grado_id: 9,
  grado: '6.°',
  seccion_id: 18,
  seccion: 'B',
  fecha_matricula: '2026-03-02',
  estado: 'matriculado',
  usuario_id: 2,
  usuario_registro: { id: 2, nombre: 'Ana', apellido: 'Soto' },
  fecha_retiro: null,
  motivo: null,
  documentos: [
    {
      id: 3,
      documento_requerido_id: 2,
      nombre: 'DNI',
      estado: 'pendiente',
      fecha_entrega: null,
    },
  ],
}

const paginated = (key: string, items: unknown[], lastPage = 1) => ({
  message: 'Listado del colegio.',
  data: {
    [key]: items,
    paginacion: {
      pagina: 1,
      por_pagina: 25,
      total: items.length,
      ultima_pagina: lastPage,
      siguiente: null,
      anterior: null,
    },
  },
  errors: null,
  code: 'OK',
})

async function loadApi(
  respond: (request: Request) => Response | Promise<Response>,
) {
  const requests: Request[] = []
  const fetchMock = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const request =
        input instanceof Request ? input : new Request(input, init)
      requests.push(request.clone())
      return respond(request)
    },
  )
  localStorage.setItem('sge_access_token', 'token-de-prueba')
  vi.stubGlobal('fetch', fetchMock)
  vi.resetModules()
  const api = await import('./enrollments-api')
  return { api, requests }
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('enrollments-api con respuestas reales', () => {
  afterEach(() => {
    localStorage.clear()
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.resetModules()
  })

  it('lee la colección y aplica búsqueda, filtros y orden de la API', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse(paginated('matriculas', [enrollment])),
    )
    const result = await api.listEnrollments({
      page: 2,
      perPage: 25,
      search: 'Samuel',
      academicYearId: '1',
      gradeId: '9',
      sectionId: '18',
      studentId: '18',
      status: 'matriculado',
      sort: 'fecha_matricula',
      direction: 'desc',
    })

    expect(result.items[0]?.alumno.nombre).toBe('Samuel')
    const request = requests[0]
    const query = new URL(request?.url ?? '').searchParams
    expect(query.get('buscar')).toBe('Samuel')
    expect(query.get('anio_escolar_id')).toBe('1')
    expect(query.get('grado_id')).toBe('9')
    expect(query.get('seccion_id')).toBe('18')
    expect(query.get('alumno_id')).toBe('18')
    expect(query.get('estado')).toBe('matriculado')
    expect(query.get('sort')).toBe('fecha_matricula')
    expect(query.get('direction')).toBe('desc')
  })

  it('lee el detalle con documentos y busca alumnos por buscar', async () => {
    const { api, requests } = await loadApi((request) => {
      if (new URL(request.url).pathname.endsWith('/alumnos')) {
        return jsonResponse(
          paginated('alumnos', [
            {
              id: 18,
              nombre: 'Samuel',
              apellido: 'Aguilar',
              documento: '90000018',
            },
          ]),
        )
      }
      return jsonResponse({ data: { matricula: enrollment } })
    })
    const detail = await api.getEnrollment(18)
    const students = await api.searchEnrollmentStudents('Samu')

    expect(detail.documentos[0]?.nombre).toBe('DNI')
    expect(students.items[0]?.id).toBe(18)
    expect(new URL(requests[1]?.url ?? '').searchParams.get('buscar')).toBe(
      'Samu',
    )
  })

  it('registra una matrícula con el token Bearer y lee su recurso', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({ data: { matricula: enrollment } }, 201),
    )
    const created = await api.createEnrollment({
      alumno_id: 18,
      anio_escolar_id: 1,
      grado_id: 9,
      seccion_id: 18,
      fecha_matricula: '2026-03-02',
      estado: 'matriculado',
    })
    const request = requests[0]

    expect(created.id).toBe(18)
    expect(request?.method).toBe('POST')
    expect(request?.headers.get('authorization')).toBe('Bearer token-de-prueba')
    expect(await request?.json()).toEqual({
      alumno_id: 18,
      anio_escolar_id: 1,
      grado_id: 9,
      seccion_id: 18,
      fecha_matricula: '2026-03-02',
      estado: 'matriculado',
    })
  })

  it('propaga errores 422 por campo', async () => {
    const { api } = await loadApi(() =>
      jsonResponse(
        {
          message: 'Datos inválidos.',
          data: null,
          errors: { alumno_id: ['Falta responsable de pago.'] },
          code: 'VALIDATION_ERROR',
        },
        422,
      ),
    )
    await expect(
      api.createEnrollment({
        alumno_id: 18,
        anio_escolar_id: 1,
        grado_id: 9,
        seccion_id: 18,
        fecha_matricula: '2026-03-02',
        estado: 'matriculado',
      }),
    ).rejects.toMatchObject({
      status: 422,
      errors: { alumno_id: ['Falta responsable de pago.'] },
    })
  })

  it('cambia estado y sección usando los contratos y el token Bearer', async () => {
    const { api, requests } = await loadApi(() =>
      jsonResponse({ data: { matricula: enrollment } }),
    )
    await api.changeEnrollmentStatus(18, {
      estado: 'retirado',
      motivo: 'Traslado',
      fecha_retiro: '2026-03-02',
    })
    await api.changeEnrollmentSection(18, {
      grado_id: 9,
      seccion_id: 19,
      motivo: 'Solicitud familiar',
      fecha: '2026-03-02',
      autorizar_exceso: true,
      motivo_exceso: 'Continuidad escolar',
    })

    expect(new URL(requests[0]?.url ?? '').pathname).toBe(
      '/api/v1/matriculas/18/estado',
    )
    expect(await requests[0]?.json()).toEqual({
      estado: 'retirado',
      motivo: 'Traslado',
      fecha_retiro: '2026-03-02',
    })
    expect(requests[1]?.headers.get('authorization')).toBe(
      'Bearer token-de-prueba',
    )
    expect(new URL(requests[1]?.url ?? '').pathname).toBe(
      '/api/v1/matriculas/18/cambiar-seccion',
    )
    expect(await requests[1]?.json()).toEqual({
      grado_id: 9,
      seccion_id: 19,
      motivo: 'Solicitud familiar',
      fecha: '2026-03-02',
      autorizar_exceso: true,
      motivo_exceso: 'Continuidad escolar',
    })
  })

  it('actualiza los documentos requeridos con PATCH y valida la respuesta', async () => {
    const document = {
      id: 3,
      documento_requerido_id: 2,
      nombre: 'DNI',
      estado: 'entregado',
      fecha_entrega: '2026-03-02',
    }
    const { api, requests } = await loadApi(() =>
      jsonResponse({ data: { documento: document } }),
    )
    await api.updateEnrollmentDocument(3, {
      estado: 'entregado',
      fecha_entrega: '2026-03-02',
    })
    expect(requests[0]?.method).toBe('PATCH')
    expect(new URL(requests[0]?.url ?? '').pathname).toBe(
      '/api/v1/matricula-documentos/3',
    )
    expect(await requests[0]?.json()).toEqual({
      estado: 'entregado',
      fecha_entrega: '2026-03-02',
    })
  })

  it('lista y actualiza documentos requeridos', async () => {
    const { api, requests } = await loadApi((request) => {
      const method = request.method
      return jsonResponse(
        method === 'GET'
          ? {
              data: {
                documentos: [
                  { id: 2, nombre: 'DNI', obligatorio: true, activo: true },
                ],
              },
            }
          : {
              data: {
                documento: {
                  id: 2,
                  nombre: 'DNI actualizado',
                  obligatorio: true,
                  activo: true,
                },
              },
            },
      )
    })
    const listed = await api.listRequiredDocuments()
    const updated = await api.updateRequiredDocument(2, {
      nombre: 'DNI actualizado',
      obligatorio: true,
      activo: true,
    })
    expect(listed[0]?.nombre).toBe('DNI')
    expect(updated.nombre).toBe('DNI actualizado')
    expect(requests[1]?.method).toBe('PUT')
  })

  it('descarga el PDF por la API con el nombre esperado', async () => {
    const { api, requests } = await loadApi(
      () =>
        new Response(new Blob(['pdf'], { type: 'application/pdf' }), {
          status: 200,
          headers: { 'Content-Type': 'application/pdf' },
        }),
    )
    const createUrl = vi
      .spyOn(URL, 'createObjectURL')
      .mockReturnValue('blob:ficha')
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    await api.downloadEnrollmentFicha(18)

    expect(new URL(requests[0]?.url ?? '').pathname).toBe(
      '/api/v1/matriculas/18/ficha',
    )
    expect(createUrl).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    expect(click.mock.instances[0]).toHaveProperty(
      'download',
      'ficha-matricula-18.pdf',
    )
  })

  it('busca apoderados del alumno en hasta cinco páginas y usa la relación', async () => {
    const { api, requests } = await loadApi((request) => {
      const page = Number(new URL(request.url).searchParams.get('page'))
      return jsonResponse(
        paginated(
          'apoderados',
          [
            {
              id: page === 1 ? 7 : page + 10,
              nombre: page === 1 ? 'Rosa' : 'Otro',
              apellido: 'Vega',
              alumnos:
                page === 1
                  ? [
                      {
                        id: 18,
                        parentesco: 'Madre',
                        telefono: '900000001',
                        correo: 'rosa@example.test',
                        responsable_pago: true,
                      },
                    ]
                  : [],
            },
          ],
          8,
        ),
      )
    })
    const guardians = await api.listStudentGuardians(18)

    expect(requests).toHaveLength(5)
    expect(guardians).toEqual([
      {
        id: 7,
        nombre: 'Rosa',
        apellido: 'Vega',
        parentesco: 'Madre',
        telefono: '900000001',
        email: 'rosa@example.test',
        responsable_pago: true,
      },
    ])
  })
})
