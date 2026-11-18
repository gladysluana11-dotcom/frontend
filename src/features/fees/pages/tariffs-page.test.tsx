import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionRoles } from '../../../test/session'
import TariffsPage from './tariffs-page'

const mocks = vi.hoisted(() => ({
  useAcademicYears: vi.fn(),
  useAcademicLevels: vi.fn(),
  useGrades: vi.fn(),
  useTariffs: vi.fn(),
  create: { mutateAsync: vi.fn(), isPending: false },
  update: { mutateAsync: vi.fn(), isPending: false },
}))

vi.mock('../hooks/use-fees', () => ({
  useAcademicYears: mocks.useAcademicYears,
  useAcademicLevels: mocks.useAcademicLevels,
  useGrades: mocks.useGrades,
  useTariffs: mocks.useTariffs,
  useTariffMutations: () => ({
    create: mocks.create,
    update: mocks.update,
  }),
}))

const year = { id: 2026, nombre: '2026', cerrado: true }
const grade = {
  id: 3,
  nivel_id: 2,
  nombre: 'Primero',
  nivel: 'Primaria',
}
const tariff = {
  id: 8,
  anio_escolar_id: 2026,
  grado_id: 3,
  grado: 'Primero',
  monto_matricula: 250,
  monto_pension: 180.5,
  numero_cuotas: 10,
  dia_vencimiento: 28,
  mes_primera_pension: 3,
}

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
            path="/configuracion/tarifas"
            element={
              <>
                <TariffsPage />
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
    data: { items: [year] },
    isPending: false,
    error: null,
    refetch: vi.fn(),
  })
  mocks.useAcademicLevels.mockReturnValue({
    data: { items: [{ id: 2, nombre: 'Primaria' }] },
    isPending: false,
    error: null,
    refetch: vi.fn(),
  })
  mocks.useGrades.mockReturnValue({
    data: { items: [grade] },
    isPending: false,
    error: null,
    refetch: vi.fn(),
  })
  mocks.useTariffs.mockReturnValue({
    data: {
      items: [tariff],
      pagination: { page: 1, perPage: 25, total: 1, lastPage: 1 },
    },
    isPending: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })
})

describe('TariffsPage', () => {
  it('permite consultar tarifas a Tesorería, pero no mostrará acciones de edición', async () => {
    renderPage('/configuracion/tarifas', ['tesoreria'])

    expect(
      await screen.findByRole('cell', { name: 'Primaria · Primero' }),
    ).toBeInTheDocument()
    expect(screen.getByText('Año escolar cerrado')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Nueva tarifa' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Editar tarifa' }),
    ).not.toBeInTheDocument()
  })

  it('mantiene año y grado en la URL y evita edición en año cerrado', async () => {
    const user = userEvent.setup()
    renderPage('/configuracion/tarifas', ['director'])

    await screen.findByRole('cell', { name: 'Primaria · Primero' })
    await user.selectOptions(screen.getByLabelText('Año escolar'), '2026')
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        'anio_escolar_id=2026',
      ),
    )
    await user.selectOptions(screen.getByLabelText('Grado'), '3')
    await user.type(screen.getByLabelText('Buscar'), 'Primero')
    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent('grado_id=3'),
    )
    expect(screen.getByTestId('location')).toHaveTextContent('buscar=Primero')
    expect(
      screen.queryByRole('button', { name: 'Editar tarifa' }),
    ).not.toBeInTheDocument()
  })

  it('permite iniciar una tarifa nueva y valida el formulario con Zod', async () => {
    const user = userEvent.setup()
    mocks.useAcademicYears.mockReturnValue({
      data: { items: [{ ...year, cerrado: false }] },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage('/configuracion/tarifas', ['director'])

    await user.click(
      await screen.findByRole('button', { name: 'Nueva tarifa' }),
    )

    expect(
      screen.getByRole('heading', { name: 'Nueva tarifa' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Guardar tarifa' }))
    expect(
      await screen.findByText('Selecciona el año escolar.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Selecciona el grado.')).toBeInTheDocument()
  })

  it('permite editar tarifas de años abiertos', async () => {
    const user = userEvent.setup()
    mocks.useAcademicYears.mockReturnValue({
      data: { items: [{ ...year, cerrado: false }] },
      isPending: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPage('/configuracion/tarifas', ['director'])

    await user.click(
      await screen.findByRole('button', { name: 'Editar tarifa' }),
    )
    await user.clear(screen.getByLabelText('Matrícula'))
    await user.type(screen.getByLabelText('Matrícula'), '300.00')
    await user.click(screen.getByRole('button', { name: 'Guardar tarifa' }))

    await waitFor(() =>
      expect(mocks.update.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          id: tariff.id,
          values: expect.objectContaining({ monto_matricula: '300.00' }),
        }),
      ),
    )
  })
})
