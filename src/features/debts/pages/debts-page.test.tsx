import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { setSessionRoles } from '../../../test/session'
import type { Debt } from '../schemas'
import DebtsPage from './debts-page'

const mocks = vi.hoisted(() => ({ useDebts: vi.fn() }))

vi.mock('../hooks/use-debts', () => ({
  useDebts: mocks.useDebts,
  useCollectionHistory: vi.fn(),
  useCreateCollection: vi.fn(),
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

const debt: Debt = {
  alumno_id: 7,
  nombre: 'Lucía',
  apellido: 'Torres',
  nivel: 'Primaria',
  grado: 'Segundo',
  seccion: 'B',
  total_vencido: 120.5,
  total_pendiente: 250,
  cuotas_vencidas: 1,
  dias_atraso: 12,
  apoderado_responsable_pago: {
    nombre: 'Rosa',
    apellido: 'Torres',
    telefono: '999111222',
    email: 'rosa@example.edu.pe',
  },
}

function LocationText() {
  const location = useLocation()
  return <p data-testid="location">{location.search}</p>
}

function renderPage(roles = ['director'], initialPath = '/deudas') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[initialPath]}>
        <LocationText />
        <Routes>
          <Route path="/deudas" element={<DebtsPage />} />
          <Route
            path="/alumnos/:id/estado-cuenta"
            element={<p>Estado de cuenta</p>}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useDebts.mockReturnValue({
    data: {
      items: [debt],
      pagination: { page: 1, perPage: 25, total: 1, lastPage: 1 },
    },
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('DebtsPage', () => {
  it('shows debt and responsible payment contact returned by the API', () => {
    renderPage()

    expect(screen.getByText('Torres, Lucía')).toBeInTheDocument()
    expect(screen.getByText('Torres, Rosa')).toBeInTheDocument()
    expect(screen.getByText('999111222')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ver estado de cuenta' }),
    ).toHaveAttribute('href', '/alumnos/7/estado-cuenta')
  })

  it('keeps student search out of the browser URL while filter IDs remain there', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.type(screen.getByLabelText('Buscar alumno'), 'Lucía')
    fireEvent.change(screen.getByLabelText('Nivel'), { target: { value: '2' } })

    await waitFor(() => {
      expect(screen.getByTestId('location')).toHaveTextContent('nivel_id=2')
    })
    expect(screen.getByTestId('location')).not.toHaveTextContent('Lucía')
    expect(screen.getByTestId('location')).not.toHaveTextContent('buscar')
  })

  it('shows collection management to Coordination without exposing payment account details', () => {
    renderPage(['coordinacion'])

    expect(
      screen.getByRole('button', { name: 'Gestionar cobranza' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Ver estado de cuenta' }),
    ).not.toBeInTheDocument()
  })
})
