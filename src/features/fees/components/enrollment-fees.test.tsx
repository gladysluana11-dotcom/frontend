import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionRoles } from '../../../test/session'
import { EnrollmentFees } from './enrollment-fees'

const mocks = vi.hoisted(() => ({
  useEnrollmentQuotas: vi.fn(),
  generate: { mutateAsync: vi.fn(), isPending: false },
  createQuota: { mutateAsync: vi.fn(), isPending: false },
  createEnrollment: { mutateAsync: vi.fn(), isPending: false },
  cancel: { mutateAsync: vi.fn(), isPending: false },
}))

vi.mock('../hooks/use-fees', () => ({
  useEnrollmentQuotas: mocks.useEnrollmentQuotas,
  useGenerateEnrollmentQuotas: () => mocks.generate,
  useCreateQuotaDiscount: () => mocks.createQuota,
  useCreateEnrollmentDiscounts: () => mocks.createEnrollment,
  useCancelDiscount: () => mocks.cancel,
}))

const quota = {
  id: 20,
  matricula_id: 2,
  alumno_id: 4,
  concepto: 'pension' as const,
  numero: 1,
  descripcion: 'Pensión de marzo',
  monto_original: 180,
  vencimiento: '2026-03-10',
  anulada_en: null,
  saldo: 150,
  total_descuentos: 30,
  total_pagos: 0,
  estado: 'pendiente' as const,
}

function renderPanel(roles: string[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <EnrollmentFees enrollmentId={2} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useEnrollmentQuotas.mockReturnValue({
    data: { items: [quota] },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })
  mocks.generate.mutateAsync.mockResolvedValue([quota])
})

describe('EnrollmentFees', () => {
  it('muestra cuotas y descuentos aplicados tal como los devuelve la API', async () => {
    renderPanel(['tesoreria'])

    expect(await screen.findByText('Pensión de marzo')).toBeInTheDocument()
    expect(screen.getByText(/150\.00/)).toBeInTheDocument()
    expect(screen.getByText(/30\.00/)).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Aplicar a esta cuota' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Descuentos, becas y exoneraciones'),
    ).not.toBeInTheDocument()
  })

  it('solo permite descuentos al Director y muestra las acciones por cuota', async () => {
    renderPanel(['director'])

    expect(
      await screen.findByRole('heading', {
        name: 'Descuentos, becas y exoneraciones',
      }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Aplicar a esta cuota' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
  })

  it('muestra el enlace a tarifas y permite generar cuotas si aún no existen', async () => {
    const user = userEvent.setup()
    mocks.useEnrollmentQuotas.mockReturnValue({
      data: { items: [] },
      isPending: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    })
    renderPanel(['tesoreria'])

    expect(
      await screen.findByText(/No se encontró una tarifa/),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Ir a configuración de tarifas' }),
    ).toHaveAttribute('href', '/configuracion/tarifas')
    await user.click(screen.getByRole('button', { name: 'Generar cuotas' }))

    expect(mocks.generate.mutateAsync).toHaveBeenCalledWith({
      key: expect.any(String),
    })
    expect(
      screen.getByRole('button', { name: 'Generar cuotas' }),
    ).toBeDisabled()
  })
})
