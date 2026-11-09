import { afterEach, describe, expect, it, vi } from 'vitest'

/** Respuestas reales de la API (datos ficticios del seeder), para comprobar que el cliente las entiende. */
const listBody = {
  message: 'Alumnos del colegio.',
  data: {
    alumnos: [
      {
        id: 18,
        nombre: 'Samuel',
        apellido: 'Aguilar',
        documento: '****0018',
        estado: 'activo',
        matricula_actual: {
          anio_escolar_id: 1,
          grado_id: 9,
          seccion_id: 18,
          anio_escolar: '2026',
          grado: '6.°',
          seccion: 'B',
          estado: 'matriculado',
        },
      },
    ],
    paginacion: {
      pagina: 1,
      por_pagina: 2,
      total: 40,
      ultima_pagina: 20,
      siguiente: 'http://localhost:8000/api/v1/alumnos?page=2',
      anterior: null,
    },
  },
  errors: null,
  code: 'OK',
}

const detailBody = {
  message: 'Alumno encontrado.',
  data: {
    alumno: {
      id: 18,
      nombre: 'Samuel',
      apellido: 'Aguilar',
      tipo_documento: 'DNI',
      documento_identidad: '90000018',
      fecha_nacimiento: '2013-06-18',
      sexo: 'M',
      direccion: 'Dirección ficticia 18',
      foto_url: null,
      estado: 'activo',
    },
  },
  errors: null,
  code: 'OK',
}

const historyBody = {
  message: 'Historial del alumno.',
  data: {
    matriculas: [
      {
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
        fecha_retiro: null,
        motivo: null,
      },
    ],
    cambios_estado: [
      {
        estado_anterior: null,
        estado_nuevo: 'activo',
        motivo: null,
        fecha: '2026-03-02T05:00:00.000000Z',
      },
    ],
    cambios_matricula: [
      {
        evento: 'creada',
        grado_anterior_id: null,
        seccion_anterior_id: null,
        grado_nuevo_id: null,
        seccion_nueva_id: null,
        estado_anterior: null,
        estado_nuevo: 'matriculado',
        motivo: null,
        fecha: '2026-03-02T05:00:00.000000Z',
      },
    ],
  },
  errors: null,
  code: 'OK',
}

async function loadApi(body: unknown, status = 200) {
  const urls: string[] = []
  const requests: Request[] = []
  const fetchMock = vi.fn(async (input: Request | string) => {
    if (typeof input === 'string') {
      // Cookie CSRF de Sanctum: responde 204 sin cuerpo.
      return new Response(null, { status: 204 })
    }
    urls.push(input.url)
    requests.push(input.clone())
    return new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })
  })
  // Sanctum entrega la cookie XSRF-TOKEN; el cliente la copia en la cabecera X-XSRF-TOKEN.
  document.cookie = 'XSRF-TOKEN=token-de-prueba; path=/'
  vi.stubGlobal('fetch', fetchMock)
  vi.resetModules()
  const api = await import('./students-api')
  return { api, urls, requests }
}

describe('students-api con respuestas reales', () => {
  afterEach(() => {
    document.cookie =
      'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('entiende el listado y envía la paginación y los filtros a la API', async () => {
    const { api, urls } = await loadApi(listBody)

    const page = await api.listStudents({
      page: 2,
      perPage: 25,
      search: 'Sam',
      status: 'activo',
      gradeId: '9',
      sort: 'apellido',
      direction: 'desc',
    })

    expect(page.items[0]?.matricula_actual?.grado).toBe('6.°')
    expect(page.pagination).toEqual({
      page: 1,
      perPage: 2,
      total: 40,
      lastPage: 20,
    })

    const query = new URL(urls[0] as string).searchParams
    expect(query.get('page')).toBe('2')
    expect(query.get('per_page')).toBe('25')
    expect(query.get('buscar')).toBe('Sam')
    expect(query.get('estado')).toBe('activo')
    expect(query.get('grado_id')).toBe('9')
    expect(query.get('sort')).toBe('apellido')
    expect(query.get('direction')).toBe('desc')
  })

  it('ignora filtros inválidos en vez de enviarlos a la API', async () => {
    const { api, urls } = await loadApi(listBody)

    await api.listStudents({
      page: 1,
      perPage: 25,
      status: 'inventado',
      gradeId: 'abc',
      sort: 'password',
    })

    const query = new URL(urls[0] as string).searchParams
    expect(query.has('estado')).toBe(false)
    expect(query.has('grado_id')).toBe(false)
    expect(query.has('sort')).toBe(false)
  })

  it('entiende la ficha del alumno', async () => {
    const { api } = await loadApi(detailBody)

    const student = await api.getStudent(18)

    expect(student.documento_identidad).toBe('90000018')
    expect(student.foto_url).toBeNull()
  })

  it('entiende el historial del alumno', async () => {
    const { api } = await loadApi(historyBody)

    const history = await api.getStudentHistory(18)

    expect(history.matriculas).toHaveLength(1)
    expect(history.cambios_estado[0]?.estado_nuevo).toBe('activo')
    expect(history.cambios_matricula[0]?.evento).toBe('creada')
  })

  it('devuelve null cuando el alumno no tiene foto (404)', async () => {
    const { api } = await loadApi(
      {
        message: 'No encontrado.',
        data: null,
        errors: null,
        code: 'NOT_FOUND',
      },
      404,
    )

    await expect(api.getStudentPhoto(18)).resolves.toBeNull()
  })

  describe('escrituras', () => {
    const form = {
      nombre: 'Ana',
      apellido: 'Soto',
      tipo_documento: 'DNI',
      documento_identidad: '12345678',
      fecha_nacimiento: '2014-05-10',
      sexo: 'F',
      direccion: 'Jr. Ficticio 123',
    }

    it('crea un alumno con los siete campos y lee la respuesta', async () => {
      const { api, requests } = await loadApi(
        {
          message: 'Alumno creado.',
          data: { alumno: { ...detailBody.data.alumno, id: 41 } },
          errors: null,
          code: 'OK',
        },
        201,
      )

      const created = await api.createStudent(form)

      expect(created?.id).toBe(41)
      expect(requests.at(-1)?.method).toBe('POST')
      expect(new URL(requests.at(-1)?.url as string).pathname).toBe(
        '/api/v1/alumnos',
      )
      expect(await requests.at(-1)?.json()).toEqual(form)
      expect(requests.at(-1)?.headers.get('x-xsrf-token')).toBe(
        'token-de-prueba',
      )
      expect(requests.at(-1)?.headers.get('accept')).toBe('application/json')
    })

    it('no falla si la API guardó el alumno pero la respuesta tiene otra forma', async () => {
      const { api } = await loadApi(
        {
          message: 'Alumno creado.',
          data: { alumno: [] },
          errors: null,
          code: 'OK',
        },
        201,
      )

      await expect(api.createStudent(form)).resolves.toBeUndefined()
    })

    it('muestra los errores de validación del servidor por campo', async () => {
      const { api } = await loadApi(
        {
          message: 'Datos inválidos.',
          data: null,
          errors: {
            documento_identidad: ['Ya existe un alumno con ese documento.'],
          },
          code: 'VALIDATION_ERROR',
        },
        422,
      )

      await expect(api.createStudent(form)).rejects.toMatchObject({
        status: 422,
        errors: {
          documento_identidad: ['Ya existe un alumno con ese documento.'],
        },
      })
    })

    it('actualiza con PATCH enviando solo lo que cambió', async () => {
      const { api, requests } = await loadApi({
        message: 'Alumno actualizado.',
        data: { alumno: [] },
        errors: null,
        code: 'OK',
      })

      await api.updateStudent(18, {
        direccion: 'Otra',
        estado: 'retirado',
        motivo: 'Traslado',
      })

      const request = requests.at(-1)
      expect(request?.method).toBe('PATCH')
      expect(new URL(request?.url as string).pathname).toBe(
        '/api/v1/alumnos/18',
      )
      expect(await request?.json()).toEqual({
        direccion: 'Otra',
        estado: 'retirado',
        motivo: 'Traslado',
      })
    })

    it('ignora un estado que la API no conoce', async () => {
      const { api, requests } = await loadApi({
        message: 'ok',
        data: { alumno: [] },
        errors: null,
        code: 'OK',
      })

      await api.updateStudent(18, { estado: 'inventado', direccion: 'Otra' })

      expect(await requests.at(-1)?.json()).toEqual({ direccion: 'Otra' })
    })

    it('sube la foto como formulario con el campo foto', async () => {
      const { api, requests } = await loadApi({
        message: 'ok',
        data: { foto_url: 'x' },
        errors: null,
        code: 'OK',
      })
      const photo = new File([new Uint8Array([1, 2, 3])], 'foto.png', {
        type: 'image/png',
      })

      await api.uploadStudentPhoto(18, photo)

      const request = requests.at(-1)
      expect(request?.method).toBe('POST')
      expect(new URL(request?.url as string).pathname).toBe(
        '/api/v1/alumnos/18/foto',
      )
      expect(request?.headers.get('content-type')).toMatch(
        /^multipart\/form-data; boundary=/,
      )
      const data = await request?.formData()
      // El entorno de pruebas puede renombrar el archivo; lo que importa es el campo y el contenido.
      expect((data?.get('foto') as Blob).size).toBe(3)
    })

    it('crea y vincula un apoderado, enviando null en teléfono y correo vacíos', async () => {
      const { api, requests } = await loadApi(
        {
          message: 'ok',
          data: { apoderado: { id: 9, nombre: 'Rosa', apellido: 'Vega' } },
          errors: null,
          code: 'OK',
        },
        201,
      )

      const guardian = await api.createGuardian(18, {
        nombre: 'Rosa',
        apellido: 'Vega',
        parentesco: 'Madre',
        telefono: '',
        email: '  ',
        responsable_pago: true,
      })

      expect(guardian?.id).toBe(9)
      const request = requests.at(-1)
      expect(new URL(request?.url as string).pathname).toBe(
        '/api/v1/alumnos/18/apoderados',
      )
      expect(await request?.json()).toEqual({
        nombre: 'Rosa',
        apellido: 'Vega',
        parentesco: 'Madre',
        telefono: null,
        email: null,
        responsable_pago: true,
      })
    })

    it('vincula un apoderado existente con PUT', async () => {
      const { api, requests } = await loadApi({
        message: 'ok',
        data: { apoderado: [] },
        errors: null,
        code: 'OK',
      })

      await api.linkGuardian(18, 5, {
        parentesco: 'Tía',
        telefono: '900000001',
        email: '',
        responsable_pago: false,
      })

      const request = requests.at(-1)
      expect(request?.method).toBe('PUT')
      expect(new URL(request?.url as string).pathname).toBe(
        '/api/v1/alumnos/18/apoderados/5',
      )
      expect(await request?.json()).toEqual({
        parentesco: 'Tía',
        telefono: '900000001',
        email: null,
        responsable_pago: false,
      })
    })

    it('busca apoderados por nombre', async () => {
      const { api, urls } = await loadApi({
        message: 'ok',
        data: {
          apoderados: [{ id: 5, nombre: 'Rosa', apellido: 'Familia 1' }],
          paginacion: {
            pagina: 1,
            por_pagina: 10,
            total: 1,
            ultima_pagina: 1,
            siguiente: null,
            anterior: null,
          },
        },
        errors: null,
        code: 'OK',
      })

      const result = await api.searchGuardians('Fam')

      expect(result.items[0]?.apellido).toBe('Familia 1')
      expect(new URL(urls.at(-1) as string).searchParams.get('buscar')).toBe(
        'Fam',
      )
    })
  })
})
