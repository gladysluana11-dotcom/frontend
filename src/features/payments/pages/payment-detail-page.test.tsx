import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionRoles } from '../../../test/session'
import PaymentDetailPage from './payment-detail-page'

const mocks = vi.hoisted(() => ({
  cancel: vi.fn(),
  usePayment: vi.fn(),
}))

vi.mock('../../students/hooks/use-students', () => ({
  useStudent: () => ({
    data: { id: 4, nombre: 'Samuel', apellido: 'Aguilar' },
  }),
}))

vi.mock('../hooks/use-payments', () => ({
  usePayment: mocks.usePayment,
  usePaymentUser: () => ({
    data: { id: 1, nombre: 'Elena', apellido: 'Tesorería' },
    isPending: false,
  }),
  usePaymentVoucher: () => ({
    data: undefined,
    isPending: false,
    isError: false,
  }),
  useCancelPayment: () => ({
    mutateAsync: mocks.cancel,
    isPending: false,
  }),
  useUploadPaymentVoucher: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useDownloadPaymentReceipt: () => ({
    mutateAsync: vi.fn(),
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
  aplicaciones: [{ id: 1, cuota_id: 20, monto_aplicado: 250 }],
}

function renderPage(role = 'director') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, [role])
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/pagos/8']}>
        <Routes>
          <Route path="/pagos/:id" element={<PaymentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.usePayment.mockReturnValue({
    data: payment,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
})

describe('PaymentDetailPage', () => {
  it('requiere motivo antes de confirmar una anulación', async () => {
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: 'Anular pago' }))
    await user.click(
      screen.getByRole('button', { name: 'Confirmar anulación' }),
    )

    expect(
      await screen.findByText('Indica el motivo de la anulación.'),
    ).toBeInTheDocument()
    expect(mocks.cancel).not.toHaveBeenCalled()

    await user.type(screen.getByLabelText('Motivo'), 'Registro duplicado')
    await user.click(
      screen.getByRole('button', { name: 'Confirmar anulación' }),
    )
    expect(mocks.cancel).toHaveBeenCalledWith({
      motivo: 'Registro duplicado',
    })
  })

  it('oculta la acción de anular a roles sin autorización', () => {
    renderPage('administrador')
    expect(
      screen.queryByRole('button', { name: 'Anular pago' }),
    ).not.toBeInTheDocument()
  })
})
