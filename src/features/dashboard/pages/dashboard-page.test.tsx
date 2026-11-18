import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { setSessionRoles } from '../../../test/session'
import DashboardPage from './dashboard-page'

const mocks = vi.hoisted(() => ({
  alerts: vi.fn(),
  dashboard: vi.fn(),
}))

vi.mock('../../debts/hooks/use-debts', () => ({
  useDebtAlerts: mocks.alerts,
}))

vi.mock('../../reports/hooks/use-reports', () => ({
  useDirectorDashboard: mocks.dashboard,
}))

function renderPage(roles = ['director']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.alerts.mockReturnValue({
    data: {
      dias_configurados: 5,
      por_vencer: { cantidad: 4, monto: 250 },
      vencidas: { cantidad: 2, monto: 500 },
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
  mocks.dashboard.mockReturnValue({
    data: {
      resumen: {
        matriculados_por_nivel: [
          { nivel_id: 1, nivel: 'Primaria', matriculados: 42 },
        ],
        recaudacion_mes: 1200,
        deuda_total: 2500,
        deuda_vencida: 500,
        porcentaje_morosidad: '20.00',
      },
      filas: [{ nivel_id: 1, nivel: 'Primaria', matriculados: 42 }],
      filtros: { mes: '2026-11' },
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
})

describe('DashboardPage F5 panels', () => {
  it('shows debt alerts and Director metrics with an accessible chart table', () => {
    renderPage()

    expect(screen.getByText('Próximos 5 días')).toBeInTheDocument()
    expect(screen.getByText(/S\/\s*250\.00/)).toBeInTheDocument()
    expect(screen.getByText(/S\/\s*1,200\.00/)).toBeInTheDocument()
    expect(screen.getByText('20.00%')).toBeInTheDocument()
    expect(screen.getByText('Primaria')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(
      screen.getByText(
        'La API no entrega un total de matriculados independiente; no se calcula a partir de los niveles.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText(
        'La API del panel no incluye filas de ingresos mensuales emitidos y cobrados.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByTestId('enrollment-chart')).toHaveAttribute(
      'aria-hidden',
      'true',
    )
  })

  it('hides debt alerts and Director panels from roles without access', () => {
    renderPage(['docente'])

    expect(screen.queryByText('Alertas de cuotas')).not.toBeInTheDocument()
    expect(screen.queryByText('Panel del Director')).not.toBeInTheDocument()
  })
})
