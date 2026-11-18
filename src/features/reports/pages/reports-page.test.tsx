import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { setSessionRoles } from '../../../test/session'
import ReportsPage from './reports-page'

const mocks = vi.hoisted(() => ({
  enrollments: vi.fn(),
  payments: vi.fn(),
  income: vi.fn(),
  download: vi.fn(),
}))

vi.mock('../hooks/use-reports', () => ({
  useEnrollmentReport: mocks.enrollments,
  usePaymentReport: mocks.payments,
  useMonthlyIncomeReport: mocks.income,
  useDownloadReport: () => ({
    mutate: mocks.download,
    isPending: false,
    isError: false,
  }),
}))

vi.mock('../../catalog/hooks/use-catalog', () => ({
  useAcademicYears: () => ({
    data: [{ id: 2026, nombre: '2026' }],
    isError: false,
  }),
  useLevels: () => ({ data: [{ id: 2, nombre: 'Primaria' }], isError: false }),
  useGrades: () => ({
    data: [{ id: 3, nivel_id: 2, nombre: 'Segundo' }],
    isError: false,
  }),
  useSections: () => ({
    data: [{ id: 4, anio_escolar_id: 2026, grado_id: 3, nombre: 'B' }],
    isError: false,
  }),
}))

function LocationText() {
  const location = useLocation()
  return <p data-testid="location">{location.search}</p>
}

function renderPage(roles = ['director'], initialPath = '/reportes') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationText />
        <Routes>
          <Route path="/reportes" element={<ReportsPage />} />
          <Route path="/deudas/por-aula" element={<p>Deuda por aula</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.enrollments.mockReturnValue({
    data: {
      resumen: { total_matriculas: 42, pendientes_completar: 3 },
      filas: [
        {
          matricula_id: 1,
          alumno_id: 7,
          nombre: 'Lucía',
          apellido: 'Torres',
          anio_escolar: '2026',
          nivel: 'Primaria',
          grado: 'Segundo',
          seccion: 'B',
          estado: 'matriculado',
          documentos_pendientes: 1,
        },
      ],
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
  mocks.payments.mockReturnValue({
    data: {
      resumen: { cantidad: 1, total_vigente: 100 },
      filas: [],
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
  mocks.income.mockReturnValue({
    data: {
      resumen: { total_emitido: 300, total_cobrado: 250 },
      filas: [{ mes: '2026-03', cuotas_emitidas: 300, cuotas_cobradas: 250 }],
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
})

describe('ReportsPage', () => {
  it('shows matriculation counts and rows from the report response', () => {
    renderPage()

    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('Torres, Lucía')).toBeInTheDocument()
  })

  it('keeps search private while report filters stay in the URL', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Buscar alumno'), 'Lucía')
    fireEvent.change(screen.getByLabelText('Desde'), {
      target: { value: '2026-01-01' },
    })
    fireEvent.change(screen.getByLabelText('Año escolar'), {
      target: { value: '2026' },
    })

    expect(screen.getByTestId('location')).toHaveTextContent('desde=2026-01-01')
    expect(screen.getByTestId('location')).toHaveTextContent(
      'anio_escolar_id=2026',
    )
    expect(screen.getByTestId('location')).not.toHaveTextContent('Lucía')
    expect(screen.getByTestId('location')).not.toHaveTextContent('buscar')
  })

  it('limits Coordination to matriculations and classroom debt reports', () => {
    renderPage(['coordinacion'], '/reportes?reporte=pagos')

    const selector = screen.getByLabelText('Tipo de reporte')
    expect(selector).toHaveValue('matriculas')
    expect(
      screen.getByRole('option', { name: 'Matrículas y pendientes' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('option', { name: 'Pagos' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Deuda por aula' }),
    ).toHaveAttribute('href', '/deudas/por-aula')
  })

  it('shows a loading indicator while the report is being generated', () => {
    mocks.enrollments.mockReturnValue({
      data: undefined,
      isPending: true,
      isError: false,
      refetch: vi.fn(),
    })
    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent('Generando reporte…')
  })

  it('shows an error state when the report API fails', () => {
    mocks.enrollments.mockReturnValue({
      data: undefined,
      isPending: false,
      isError: true,
      error: new Error('Reporte temporalmente no disponible'),
      refetch: vi.fn(),
    })
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reporte temporalmente no disponible',
    )
  })
})
