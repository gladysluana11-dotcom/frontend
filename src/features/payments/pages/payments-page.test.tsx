import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionRoles } from '../../../test/session'
import PaymentsPage from './payments-page'

const mocks = vi.hoisted(() => ({ usePayments: vi.fn() }))

vi.mock('../../students/hooks/use-students', () => ({
  useStudent: (id: number | undefined) => ({
    data: id ? { id, nombre: 'Samuel', apellido: 'Aguilar' } : undefined,
  }),
}))

vi.mock('../hooks/use-payments', () => ({
  usePayments: mocks.usePayments,
  usePaymentUser: () => ({
    data: { id: 1, nombre: 'Elena', apellido: 'Tesorería' },
    isPending: false,
  }),
  usePaymentStudentSearch: () => ({
    data: {
      items: [{ id: 4, nombre: 'Samuel', apellido: 'Aguilar' }],
    },
    isPending: false,
  }),
}))

const payment = {
  id: 8,
  matricula_id: 2,
  alumno_id: 4,
  usuario_id: 1,
  fecha_pago: '2026-03-02',
  monto: 250,
  medio: 'efectivo',
  numero_operacion: null,
  observacion: null,
  estado: 'vigente',
  constancia: 'B001-0008',
  anulada_en: null,
  motivo_anulacion: null,
  voucher_disponible: false,
}

function LocationProbe() {
  const location = useLocation()
  return <output data-testid="location">{location.search}</output>
}

function renderPage(url: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, ['director'])
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route
            path="/pagos"
            element={
              <>
                <PaymentsPage />
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
  mocks.usePayments.mockReturnValue({
    data: {
      items: [payment],
      pagination: { page: 1, perPage: 25, total: 1, lastPage: 1 },
    },
    isPending: false,
    isFetching: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('PaymentsPage', () => {
  it('muestra pagos con los nombres y los montos entregados por la API', async () => {
    renderPage('/pagos')

    expect(await screen.findByText('B001-0008')).toBeInTheDocument()
    expect(screen.getByText('Samuel Aguilar')).toBeInTheDocument()
    expect(screen.getByText('Elena Tesorería')).toBeInTheDocument()
    expect(screen.getByText(/250\.00/)).toBeInTheDocument()
  })

  it('aplica filtros desde la URL y mantiene los cambios de estado en la URL', async () => {
    renderPage(
      '/pagos?alumno_id=4&desde=2026-03-01&hasta=2026-03-31&medio=efectivo&estado=vigente',
    )

    await screen.findByText('B001-0008')
    expect(mocks.usePayments).toHaveBeenLastCalledWith(
      expect.objectContaining({
        studentId: 4,
        desde: '2026-03-01',
        hasta: '2026-03-31',
        medio: 'efectivo',
        estado: 'vigente',
      }),
    )

    await userEvent.selectOptions(screen.getByLabelText('Estado'), 'anulado')

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        'estado=anulado',
      ),
    )
    expect(mocks.usePayments).toHaveBeenLastCalledWith(
      expect.objectContaining({ estado: 'anulado', page: 1 }),
    )
  })
})
