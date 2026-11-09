import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import { setSessionRoles } from '../../../test/session'
import * as catalogApi from '../../catalog/api/catalog-api'
import * as studentsApi from '../api/students-api'
import StudentsPage from './students-page'

vi.mock('../api/students-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/students-api')>()),
  listStudents: vi.fn(),
}))

vi.mock('../../catalog/api/catalog-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../catalog/api/catalog-api')>()),
  listAcademicYears: vi.fn(),
  listLevels: vi.fn(),
  listGrades: vi.fn(),
  listSections: vi.fn(),
}))

const listStudents = vi.mocked(studentsApi.listStudents)

const page = {
  items: [
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
    {
      id: 19,
      nombre: 'Ana',
      apellido: 'Soto',
      documento: '****0019',
      estado: 'retirado',
      matricula_actual: null,
    },
  ],
  pagination: { page: 1, perPage: 25, total: 40, lastPage: 2 },
}

function renderPage(url = '/alumnos', roles: string[] = ['director']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/alumnos" element={<StudentsPage />} />
          <Route path="/alumnos/:id" element={<p>Ficha del alumno</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  listStudents.mockResolvedValue(page)
  vi.mocked(catalogApi.listAcademicYears).mockResolvedValue([
    { id: 1, nombre: '2026', activo: true },
  ])
  vi.mocked(catalogApi.listLevels).mockResolvedValue([
    { id: 2, nombre: 'Primaria' },
    { id: 3, nombre: 'Secundaria' },
  ])
  vi.mocked(catalogApi.listGrades).mockResolvedValue([
    { id: 9, nivel_id: 2, nombre: '6.°' },
    { id: 10, nivel_id: 3, nombre: '1.°' },
  ])
  vi.mocked(catalogApi.listSections).mockResolvedValue([
    { id: 18, anio_escolar_id: 1, grado_id: 9, nombre: 'B' },
    { id: 17, anio_escolar_id: 1, grado_id: 9, nombre: 'A' },
    { id: 20, anio_escolar_id: 1, grado_id: 10, nombre: 'A' },
  ])
})

describe('StudentsPage', () => {
  it('lista los alumnos con documento enmascarado, grado y sección', async () => {
    renderPage()

    expect(await screen.findByText('Aguilar, Samuel')).toBeInTheDocument()
    expect(screen.getByText('****0018')).toBeInTheDocument()
    expect(screen.getByText('6.° B')).toBeInTheDocument()
    expect(screen.getByText('Sin matrícula')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 1–2 de 40')).toBeInTheDocument()
  })

  it('pide a la API la página, no todos los alumnos', async () => {
    renderPage()
    await screen.findByText('Aguilar, Samuel')

    expect(listStudents).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 25 }),
    )
  })

  it('busca después de que el usuario deja de escribir', async () => {
    renderPage()
    await screen.findByText('Aguilar, Samuel')

    await userEvent.type(screen.getByRole('searchbox'), 'Sam')

    await waitFor(
      () =>
        expect(listStudents).toHaveBeenLastCalledWith(
          expect.objectContaining({ search: 'Sam' }),
        ),
      { timeout: 3000 },
    )
    const searches = listStudents.mock.calls.map(([params]) => params.search)
    expect(searches).not.toContain('S')
    expect(searches).not.toContain('Sa')
  })

  it('filtra por estado y vuelve a la primera página', async () => {
    renderPage('/alumnos?page=2')
    await screen.findByText('Aguilar, Samuel')

    await userEvent.selectOptions(
      screen.getByLabelText('Estado del alumno'),
      'retirado',
    )

    await waitFor(() =>
      expect(listStudents).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'retirado', page: 1 }),
      ),
    )
  })

  it('muestra la sección solo cuando se elige un grado, con el nivel en el nombre del grado', async () => {
    renderPage()
    await screen.findByText('Aguilar, Samuel')

    const sectionSelect = screen.getByLabelText('Sección')
    expect(sectionSelect).toBeDisabled()

    const gradeSelect = screen.getByLabelText('Grado')
    await waitFor(() =>
      expect(
        within(gradeSelect).getByRole('option', { name: 'Primaria · 6.°' }),
      ).toBeInTheDocument(),
    )
    await userEvent.selectOptions(gradeSelect, '9')

    await waitFor(() => expect(sectionSelect).toBeEnabled())
    const options = within(sectionSelect)
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(options).toEqual(['Todas las secciones', 'B', 'A'])
    expect(listStudents).toHaveBeenLastCalledWith(
      expect.objectContaining({ gradeId: '9' }),
    )
  })

  it('pasa a la página siguiente pidiéndola a la API', async () => {
    renderPage()
    await screen.findByText('Aguilar, Samuel')

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))

    await waitFor(() =>
      expect(listStudents).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 }),
      ),
    )
  })

  it('abre la ficha al elegir un alumno', async () => {
    renderPage()

    await userEvent.click(await screen.findByText('Aguilar, Samuel'))

    expect(await screen.findByText('Ficha del alumno')).toBeInTheDocument()
  })

  it('muestra el error de la API con la opción de reintentar', async () => {
    listStudents.mockRejectedValue(
      new ApiError('No tienes permiso para realizar esta acción.', {
        kind: 'forbidden',
        status: 403,
      }),
    )
    renderPage()

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'No tienes permiso para realizar esta acción.',
    )
    expect(
      screen.getByRole('button', { name: /intentar nuevamente/i }),
    ).toBeInTheDocument()
  })

  it('muestra el estado vacío cuando no hay alumnos', async () => {
    listStudents.mockResolvedValue({
      items: [],
      pagination: { page: 1, perPage: 25, total: 0, lastPage: 1 },
    })
    renderPage()

    expect(
      await screen.findByText('No hay alumnos para mostrar'),
    ).toBeInTheDocument()
  })

  it('permite limpiar los filtros', async () => {
    renderPage('/alumnos?estado=retirado')
    await screen.findByText('Aguilar, Samuel')

    await userEvent.click(
      screen.getByRole('button', { name: 'Limpiar filtros' }),
    )

    await waitFor(() =>
      expect(listStudents).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: undefined }),
      ),
    )
  })

  it('muestra Nuevo alumno solo a Director y Administrador', async () => {
    renderPage('/alumnos', ['director'])
    expect(
      await screen.findByRole('link', { name: 'Nuevo alumno' }),
    ).toHaveAttribute('href', '/alumnos/nuevo')
  })

  it('oculta Nuevo alumno a los demás roles', async () => {
    renderPage('/alumnos', ['tesoreria'])
    await screen.findByText('Aguilar, Samuel')
    expect(
      screen.queryByRole('link', { name: 'Nuevo alumno' }),
    ).not.toBeInTheDocument()
  })
})
