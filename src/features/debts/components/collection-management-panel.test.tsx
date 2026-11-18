import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { todayInPeru } from '../../payments/schemas'
import { CollectionManagementPanel } from './collection-management-panel'

const mocks = vi.hoisted(() => ({
  history: vi.fn(),
  create: vi.fn(),
}))

vi.mock('../hooks/use-debts', () => ({
  useCollectionHistory: mocks.history,
  useCreateCollection: () => ({
    mutateAsync: mocks.create,
    isPending: false,
  }),
}))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.history.mockReturnValue({
    data: {
      items: [
        {
          id: 1,
          alumno_id: 7,
          usuario_id: 2,
          usuario: 'Ana Torres',
          fecha: '2026-11-10',
          medio_contacto: 'whatsapp',
          resultado: 'Recordatorio enviado',
          compromiso_pago_fecha: null,
          compromiso_monto: null,
          observacion: null,
        },
      ],
      pagination: { page: 1, perPage: 25, total: 1, lastPage: 1 },
    },
    isPending: false,
    isError: false,
  })
  mocks.create.mockResolvedValue(undefined)
})

describe('CollectionManagementPanel', () => {
  it('shows the history and validates required collection results', async () => {
    const user = userEvent.setup()
    render(<CollectionManagementPanel studentId={7} />)

    expect(screen.getByText('Recordatorio enviado')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Registrar gestión' }))

    expect(
      await screen.findByText('Ingresa el resultado de la gestión.'),
    ).toBeInTheDocument()
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('submits the selected contact method and optional commitment', async () => {
    const user = userEvent.setup()
    render(<CollectionManagementPanel studentId={7} />)

    await user.selectOptions(
      screen.getByLabelText('Medio de contacto'),
      'correo',
    )
    await user.type(screen.getByLabelText('Resultado'), 'Correo entregado')
    await user.type(
      screen.getByLabelText('Monto comprometido (opcional)'),
      '25.50',
    )
    await user.type(
      screen.getByLabelText('Observación'),
      'Solicitó nuevo contacto',
    )
    await user.click(screen.getByRole('button', { name: 'Registrar gestión' }))

    await waitFor(() => expect(mocks.create).toHaveBeenCalledOnce())
    expect(mocks.create).toHaveBeenCalledWith(
      expect.objectContaining({
        fecha: todayInPeru(),
        medio_contacto: 'correo',
        resultado: 'Correo entregado',
        compromiso_monto: '25.5',
        observacion: 'Solicitó nuevo contacto',
      }),
    )
  })

  it('displays the server error on forbidden submission', async () => {
    const user = userEvent.setup()
    mocks.create.mockRejectedValue(
      new Error('No tienes permiso para realizar esta acción.'),
    )
    render(<CollectionManagementPanel studentId={7} />)

    await user.type(screen.getByLabelText('Resultado'), 'Llamada realizada')
    await user.click(screen.getByRole('button', { name: 'Registrar gestión' }))

    expect(
      await screen.findByText('No tienes permiso para realizar esta acción.'),
    ).toBeInTheDocument()
  })
})
