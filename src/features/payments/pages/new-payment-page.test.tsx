import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import NewPaymentPage from './new-payment-page'

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
}))

vi.mock('../../students/hooks/use-students', () => ({
  useStudent: () => ({ data: undefined }),
}))

vi.mock('../hooks/use-payments', () => ({
  usePaymentStudentSearch: () => ({
    data: {
      items: [{ id: 4, nombre: 'Samuel', apellido: 'Aguilar' }],
    },
    isPending: false,
    isError: false,
  }),
  useStudentEnrollments: () => ({
    data: {
      items: [{ id: 2, alumno_id: 4, anio_escolar_id: 2026 }],
    },
    isPending: false,
    isError: false,
  }),
  useEnrollmentQuotas: () => ({
    data: {
      items: [
        {
          id: 20,
          matricula_id: 2,
          alumno_id: 4,
          concepto: 'pension',
          numero: 1,
          descripcion: 'Pensión 1',
          monto_original: 100,
          vencimiento: '2026-03-10',
          anulada_en: null,
          saldo: 100,
          total_descuentos: 0,
          total_pagos: 0,
          estado: 'pendiente',
        },
        {
          id: 21,
          matricula_id: 2,
          alumno_id: 4,
          concepto: 'pension',
          numero: 2,
          descripcion: 'Pensión 2',
          monto_original: 150,
          vencimiento: '2026-04-10',
          anulada_en: null,
          saldo: 150,
          total_descuentos: 0,
          total_pagos: 0,
          estado: 'parcial',
        },
      ],
    },
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
  useRegisterPayment: () => ({
    mutateAsync: mocks.register,
    isPending: false,
  }),
  useDownloadPaymentReceipt: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/pagos/nuevo']}>
        <NewPaymentPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function selectStudentAndEnrollment() {
  const user = userEvent.setup()
  await user.type(
    screen.getByRole('searchbox', { name: 'Buscar alumno' }),
    'Samuel',
  )
  await user.click(
    await screen.findByRole('button', { name: 'Aguilar, Samuel' }),
  )
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Elige una matrícula' }),
    '2',
  )
  return user
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('NewPaymentPage', () => {
  it('exige número de operación para depósito y transferencia', async () => {
    renderPage()
    const user = await selectStudentAndEnrollment()
    await user.type(screen.getByLabelText('Monto'), '250.00')
    await user.selectOptions(screen.getByLabelText('Medio de pago'), 'deposito')
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }))

    expect(
      await screen.findByText(
        'Ingresa el número de operación para depósitos y transferencias.',
      ),
    ).toBeInTheDocument()
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('valida la suma de las aplicaciones manuales', async () => {
    renderPage()
    const user = await selectStudentAndEnrollment()
    await user.type(screen.getByLabelText('Monto'), '10.00')
    await user.click(screen.getByRole('radio', { name: 'Elegir cuotas' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Monto a aplicar: Pensión 1' }),
      '9.99',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }))

    expect(
      await screen.findByText(
        'La suma de las aplicaciones debe ser igual al monto del pago.',
      ),
    ).toBeInTheDocument()
    expect(mocks.register).not.toHaveBeenCalled()
  })

  it('muestra la confirmación y registra el pago', async () => {
    mocks.register.mockResolvedValue({
      pago: {
        id: 8,
        monto: 250,
        constancia: 'B001-0008',
      },
      saldos: [{ cuota_id: 20, saldo: 0, estado: 'pagada' }],
      constancia: { numero: 'B001-0008', url: '/v1/pagos/8/constancia' },
    })
    renderPage()
    const user = await selectStudentAndEnrollment()
    await user.type(screen.getByLabelText('Monto'), '250.00')
    await user.click(screen.getByRole('button', { name: 'Registrar pago' }))

    expect(
      await screen.findByRole('heading', {
        name: 'Confirma el registro del pago',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('Aguilar, Samuel')).toBeInTheDocument()

    await user.click(
      screen.getAllByRole('button', { name: 'Registrar pago' }).at(-1)!,
    )
    expect(
      await screen.findAllByText('Pago registrado correctamente'),
    ).toHaveLength(2)
    expect(mocks.register).toHaveBeenCalledWith(
      expect.objectContaining({
        values: expect.objectContaining({
          matricula_id: 2,
          monto: '250.00',
          modo_aplicacion: 'automatica',
        }),
        key: expect.any(String),
      }),
    )
  })

  it.each([
    [409, 'Esta operación ya se registró con otros datos.'],
    [429, 'El servidor recibió demasiadas solicitudes.'],
  ])(
    'explica el error %s y permite revisar antes de reintentar',
    async (status, message) => {
      mocks.register.mockRejectedValue(
        new ApiError('Error del servidor', {
          kind: status === 429 ? 'rate_limit' : 'http',
          status,
        }),
      )
      renderPage()
      const user = await selectStudentAndEnrollment()
      await user.type(screen.getByLabelText('Monto'), '250.00')
      await user.click(screen.getByRole('button', { name: 'Registrar pago' }))
      await user.click(
        screen.getAllByRole('button', { name: 'Registrar pago' }).at(-1)!,
      )

      expect(await screen.findByRole('alert')).toHaveTextContent(message)
      expect(
        screen.getByRole('button', { name: 'Registrar pago' }),
      ).toBeEnabled()
    },
  )
})
