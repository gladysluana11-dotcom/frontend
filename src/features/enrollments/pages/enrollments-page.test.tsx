import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionRoles } from '../../../test/session'
import EnrollmentsPage from './enrollments-page'

const mocks = vi.hoisted(() => ({
  useEnrollments: vi.fn(),
  useAcademicYears: vi.fn(),
  useLevels: vi.fn(),
  useGrades: vi.fn(),
  useSections: vi.fn(),
}))

vi.mock('../hooks/use-enrollments', () => ({
  useEnrollments: mocks.useEnrollments,
}))
vi.mock('../../catalog/hooks/use-catalog', () => ({
  useAcademicYears: mocks.useAcademicYears,
  useLevels: mocks.useLevels,
  useGrades: mocks.useGrades,
  useSections: mocks.useSections,
}))

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function renderPage(url: string, roles: string[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/matriculas"
            element={
              <>
                <EnrollmentsPage />
                <LocationProbe />
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useAcademicYears.mockReturnValue({
    data: [{ id: 2026, nombre: '2026' }],
  })
  mocks.useLevels.mockReturnValue({
    data: [{ id: 2, nombre: 'Primaria' }],
  })
  mocks.useGrades.mockReturnValue({
    data: [{ id: 9, nivel_id: 2, nombre: 'Sexto' }],
  })
  mocks.useSections.mockReturnValue({
    data: [{ id: 18, anio_escolar_id: 2026, grado_id: 9, nombre: 'B' }],
  })
  mocks.useEnrollments.mockReturnValue({
    data: {
      items: [
        {
          id: 18,
          alumno: { id: 18, nombre: 'Samuel', apellido: 'Aguilar' },
          anio_escolar_id: 2026,
          anio_escolar: '2026',
          grado_id: 9,
          grado: 'Sexto',
          seccion_id: 18,
          seccion: 'B',
          fecha_matricula: '2026-03-02',
          estado: 'matriculado',
        },
      ],
      pagination: { page: 1, perPage: 25, total: 1, lastPage: 1 },
    },
    isPending: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('EnrollmentsPage', () => {
  it('muestra la tabla con año, sección, fecha y estado de la API', async () => {
    renderPage('/matriculas', ['docente'])

    const table = within(
      await screen.findByRole('table', { name: 'Lista de matrículas' }),
    )
    expect(table.getByText('Aguilar, Samuel')).toBeInTheDocument()
    expect(table.getByText('2026')).toBeInTheDocument()
    expect(table.getByText('Sexto B')).toBeInTheDocument()
    expect(table.getByText('02/03/2026')).toBeInTheDocument()
    expect(table.getByText('Matriculado')).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Nueva matrícula' }),
    ).not.toBeInTheDocument()
  })

  it('guarda filtros en la URL y aplica la búsqueda tras 400 ms', async () => {
    const user = userEvent.setup()
    renderPage('/matriculas?anio_escolar_id=2026', ['director'])

    await screen.findByText('Aguilar, Samuel')
    await user.selectOptions(screen.getByLabelText('Grado'), '9')
    await user.selectOptions(screen.getByLabelText('Sección'), '18')
    await user.selectOptions(screen.getByLabelText('Estado'), 'matriculado')
    await user.type(screen.getByLabelText('Buscar alumno'), 'Samuel')

    await waitFor(
      () =>
        expect(screen.getByTestId('location')).toHaveTextContent(
          'buscar=Samuel',
        ),
      { timeout: 1500 },
    )
    expect(screen.getByTestId('location')).toHaveTextContent(
      'anio_escolar_id=2026',
    )
    expect(screen.getByTestId('location')).toHaveTextContent('grado_id=9')
    expect(screen.getByTestId('location')).toHaveTextContent('seccion_id=18')
    expect(screen.getByTestId('location')).toHaveTextContent(
      'estado=matriculado',
    )
    expect(mocks.useEnrollments.mock.calls.at(-1)?.[0]).toMatchObject({
      search: 'Samuel',
      gradeId: '9',
      sectionId: '18',
      status: 'matriculado',
    })
  })

  it('muestra la acción de crear al Coordinador', async () => {
    renderPage('/matriculas', ['coordinacion'])

    expect(
      await screen.findByRole('link', { name: 'Nueva matrícula' }),
    ).toHaveAttribute('href', '/matriculas/nueva')
  })
})
