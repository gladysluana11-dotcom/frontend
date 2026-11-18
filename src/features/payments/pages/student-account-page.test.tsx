import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionRoles } from '../../../test/session'
import StudentAccountPage from './student-account-page'

const mocks = vi.hoisted(() => ({
  useStudentAccount: vi.fn(),
  download: vi.fn(),
}))

vi.mock('../hooks/use-payments', () => ({
  useStudentAccount: mocks.useStudentAccount,
  useDownloadStudentAccount: () => ({
    mutateAsync: mocks.download,
    isPending: false,
  }),
}))

vi.mock('../../debts/components/collection-management-panel', () => ({
  CollectionManagementPanel: () => <div data-testid="collection-panel" />,
}))

const account = {
  alumno: { id: 4, nombre: 'Samuel', apellido: 'Aguilar' },
  cuotas: [
    {
      id: 20,
      matricula_id: 2,
      alumno_id: 4,
      concepto: 'pension',
      numero: 1,
      descripcion: 'Pensión 1',
      monto_original: 250,
      vencimiento: '2026-03-10',
      anulada_en: null,
      saldo: 100,
      total_descuentos: 0,
      total_pagos: 150,
      estado: 'parcial',
    },
  ],
  pagos: [],
  totales: { emitido: 250, pagado: 150, saldo: 100, vencido: 0 },
}

function renderPage(roles = ['director']) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/alumnos/4/estado-cuenta']}>
        <Routes>
          <Route
            path="/alumnos/:id/estado-cuenta"
            element={<StudentAccountPage />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useStudentAccount.mockReturnValue({
    data: account,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
})

describe('StudentAccountPage', () => {
  it('muestra los totales y estados de cuota tal como los devuelve la API', () => {
    renderPage()

    expect(
      screen.getByRole('heading', { name: 'Aguilar, Samuel' }),
    ).toBeInTheDocument()
    expect(screen.getByText(/250\.00/)).toBeInTheDocument()
    expect(screen.getByText(/150\.00/)).toBeInTheDocument()
    expect(screen.getAllByText(/100\.00/).length).toBeGreaterThan(0)
    expect(screen.getByText(/^S\/\s*0\.00$/)).toBeInTheDocument()
    expect(screen.getByText('Parcial')).toBeInTheDocument()
  })

  it('ofrece registrar pago a un rol autorizado', () => {
    renderPage()
    expect(
      screen.getByRole('link', { name: 'Registrar pago' }),
    ).toHaveAttribute('href', '/pagos/nuevo?alumno_id=4')
    expect(screen.getByTestId('collection-panel')).toBeInTheDocument()
  })

  it('no ofrece registrar pagos a Docente, Auxiliar ni Apoderado', () => {
    for (const role of ['docente', 'auxiliar', 'apoderado']) {
      const { unmount } = renderPage([role])
      expect(
        screen.queryByRole('link', { name: 'Registrar pago' }),
      ).not.toBeInTheDocument()
      expect(screen.queryByTestId('collection-panel')).not.toBeInTheDocument()
      unmount()
    }
  })
})
