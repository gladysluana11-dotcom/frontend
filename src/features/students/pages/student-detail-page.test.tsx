import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import { setSessionRoles } from '../../../test/session'
import * as studentsApi from '../api/students-api'
import StudentDetailPage from './student-detail-page'

vi.mock('../api/students-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/students-api')>()),
  getStudent: vi.fn(),
  getStudentHistory: vi.fn(),
  getStudentPhoto: vi.fn(),
}))

const getStudent = vi.mocked(studentsApi.getStudent)
const getStudentHistory = vi.mocked(studentsApi.getStudentHistory)

const student = {
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
}

const history = {
  matriculas: [
    {
      id: 18,
      anio_escolar: '2026',
      grado: '6.°',
      seccion: 'B',
      fecha_matricula: '2026-03-02',
      estado: 'matriculado',
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
      estado_anterior: null,
      estado_nuevo: 'matriculado',
      motivo: null,
      fecha: '2026-03-02T05:00:00.000000Z',
    },
  ],
}

function renderPage(url = '/alumnos/18', roles: string[] = ['director']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/alumnos" element={<p>Lista de alumnos</p>} />
          <Route path="/alumnos/:id" element={<StudentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  getStudent.mockResolvedValue(student)
  getStudentHistory.mockResolvedValue(history)
})

describe('StudentDetailPage', () => {
  it('muestra los datos personales con formato es-PE', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { name: 'Samuel Aguilar' }),
    ).toBeInTheDocument()
    expect(screen.getByText('90000018')).toBeInTheDocument()
    expect(screen.getByText('18/06/2013')).toBeInTheDocument()
    expect(screen.getByText('Masculino')).toBeInTheDocument()
    expect(screen.getByText('Dirección ficticia 18')).toBeInTheDocument()
  })

  it('muestra la matrícula y el historial', async () => {
    renderPage()

    const enrollments = within(
      await screen.findByRole('table', { name: 'Matrículas' }),
    )
    expect(enrollments.getByText('6.° B')).toBeInTheDocument()
    expect(enrollments.getByText('02/03/2026')).toBeInTheDocument()
    expect(
      await screen.findByText('Matrícula creada (Matriculado)'),
    ).toBeInTheDocument()
    expect(screen.getByText('Estado del alumno: Activo')).toBeInTheDocument()
  })

  it('no pide la foto si el alumno no tiene', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Samuel Aguilar' })

    expect(studentsApi.getStudentPhoto).not.toHaveBeenCalled()
    expect(screen.getByRole('img', { name: 'Sin foto' })).toBeInTheDocument()
  })

  it('avisa cuando el alumno no existe o no es accesible', async () => {
    getStudent.mockRejectedValue(
      new ApiError('No encontrado', { kind: 'http', status: 404 }),
    )
    renderPage()

    expect(
      await screen.findByText(
        'El alumno no existe o no tienes acceso a su ficha.',
      ),
    ).toBeInTheDocument()
  })

  it('avisa cuando el rol no tiene permiso', async () => {
    getStudent.mockRejectedValue(
      new ApiError('Prohibido', { kind: 'forbidden', status: 403 }),
    )
    renderPage()

    expect(
      await screen.findByText(
        'Tu rol no tiene permiso para ver esta información.',
      ),
    ).toBeInTheDocument()
  })

  it('trata un identificador inválido como alumno no encontrado', async () => {
    renderPage('/alumnos/abc')

    expect(
      await screen.findByText(
        'El alumno no existe o no tienes acceso a su ficha.',
      ),
    ).toBeInTheDocument()
    expect(getStudent).not.toHaveBeenCalled()
  })

  it('permite volver a la lista', async () => {
    renderPage()

    expect(
      await screen.findByRole('link', { name: /volver a alumnos/i }),
    ).toHaveAttribute('href', '/alumnos')
  })

  it('muestra las acciones de edición al Director y al Administrador', async () => {
    renderPage('/alumnos/18', ['administrador'])

    expect(
      await screen.findByRole('link', { name: 'Editar datos' }),
    ).toHaveAttribute('href', '/alumnos/18/editar')
    expect(
      screen.getByRole('button', { name: 'Cambiar estado' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Elige una imagen')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Agregar apoderado nuevo' }),
    ).toBeInTheDocument()
  })

  it('oculta las acciones de edición a los demás roles', async () => {
    renderPage('/alumnos/18', ['docente'])

    await screen.findByRole('heading', { name: 'Samuel Aguilar' })
    expect(
      screen.queryByRole('link', { name: 'Editar datos' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cambiar estado' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Elige una imagen')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Agregar apoderado nuevo' }),
    ).not.toBeInTheDocument()
  })

  it('abre el panel para cambiar el estado', async () => {
    renderPage()

    await userEvent.click(
      await screen.findByRole('button', { name: 'Cambiar estado' }),
    )

    expect(
      screen.getByRole('form', { name: 'Cambiar estado' }),
    ).toBeInTheDocument()
  })
})
