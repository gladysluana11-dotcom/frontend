import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import { setSessionRoles } from '../../../test/session'
import CashboxPage from './cashbox-page'

const mocks = vi.hoisted(() => ({
  useCashSummary: vi.fn(),
  mutateAsync: vi.fn(),
}))

vi.mock('../hooks/use-fees', () => ({
  useCashSummary: mocks.useCashSummary,
  useCloseCashBox: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}))

vi.mock('../../payments/hooks/use-payments', () => ({
  usePaymentUser: () => ({
    data: { nombre: 'Elena', apellido: 'Tesorería' },
  }),
}))

const summary = {
  fecha: '2026-03-10',
  total: 430.5,
  cantidad_pagos: 2,
  por_usuario: [{ usuario_id: 1, usuario: 'Elena', cantidad: 2, total: 430.5 }],
  por_medio: [{ medio: 'efectivo', cantidad: 2, total: 430.5 }],
}

function renderPage(roles: string[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/caja']}>
        <Routes>
          <Route path="/caja" element={<CashboxPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useCashSummary.mockReturnValue({
    data: summary,
    isPending: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  })
  mocks.mutateAsync.mockResolvedValue({
    id: 5,
    fecha: '2026-03-10',
    observacion: 'Revisado',
    total: 430.5,
    resumen: [],
    usuario_id: 1,
  })
})

describe('CashboxPage', () => {
  it('muestra la recaudación del servidor y restringe el cierre por rol', async () => {
    renderPage(['administrador'])

    expect(await screen.findByText('Cantidad de pagos')).toBeInTheDocument()
    expect(screen.getAllByText(/430\.50/).length).toBeGreaterThan(0)
    expect(
      screen.queryByRole('button', { name: 'Cerrar caja' }),
    ).not.toBeInTheDocument()
  })

  it('Tesorería puede confirmar el cierre y ve el usuario devuelto por la API', async () => {
    const user = userEvent.setup()
    renderPage(['tesoreria'])

    await user.click(await screen.findByRole('button', { name: 'Cerrar caja' }))
    expect(screen.getByRole('alertdialog')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Confirmar cierre de caja' }),
    )

    expect(
      await screen.findByText('Cierre registrado por usuario: Elena Tesorería'),
    ).toBeInTheDocument()
    expect(mocks.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ observacion: '', key: expect.any(String) }),
    )
    expect(
      screen.queryByRole('button', { name: 'Cerrar caja' }),
    ).not.toBeInTheDocument()
  })

  it('explica el conflicto cuando la API indica que la fecha ya está cerrada', async () => {
    const user = userEvent.setup()
    mocks.mutateAsync.mockRejectedValue(
      new ApiError('conflict', { kind: 'http', status: 409 }),
    )
    renderPage(['director'])

    await user.click(await screen.findByRole('button', { name: 'Cerrar caja' }))
    await user.click(
      screen.getByRole('button', { name: 'Confirmar cierre de caja' }),
    )

    expect(
      await screen.findByText(
        'La caja de esta fecha ya fue cerrada. Actualiza la información o consulta con el usuario responsable.',
      ),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Cerrar caja' }),
    ).not.toBeInTheDocument()
  })
})
