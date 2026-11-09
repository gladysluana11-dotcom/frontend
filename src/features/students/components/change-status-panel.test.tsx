import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as studentsApi from '../api/students-api'
import { ChangeStatusPanel } from './change-status-panel'

vi.mock('../api/students-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/students-api')>()),
  updateStudent: vi.fn(),
}))

const updateStudent = vi.mocked(studentsApi.updateStudent)

function renderPanel(onDone = vi.fn()) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <ChangeStatusPanel
        studentId={18}
        currentStatus="activo"
        onDone={onDone}
      />
    </QueryClientProvider>,
  )
  return onDone
}

beforeEach(() => {
  vi.resetAllMocks()
  updateStudent.mockResolvedValue(undefined)
})

describe('ChangeStatusPanel', () => {
  it('no ofrece el estado actual', () => {
    renderPanel()

    const options = within(screen.getByLabelText('Nuevo estado'))
      .getAllByRole('option')
      .map((option) => option.textContent)
    expect(options).toEqual(['Elige una opción', 'Retirado', 'Egresado'])
  })

  it('exige elegir un estado', async () => {
    renderPanel()

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar estado' }),
    )

    expect(
      await screen.findByText('Elige el nuevo estado.'),
    ).toBeInTheDocument()
    expect(updateStudent).not.toHaveBeenCalled()
  })

  it('exige el motivo para retirar', async () => {
    renderPanel()
    await userEvent.selectOptions(
      screen.getByLabelText('Nuevo estado'),
      'retirado',
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar estado' }),
    )

    expect(
      await screen.findByText('Indica el motivo del retiro.'),
    ).toBeInTheDocument()
    expect(updateStudent).not.toHaveBeenCalled()
  })

  it('envía el estado y el motivo a la API y cierra el panel', async () => {
    const onDone = renderPanel()
    await userEvent.selectOptions(
      screen.getByLabelText('Nuevo estado'),
      'retirado',
    )
    await userEvent.type(screen.getByLabelText('Motivo'), 'Traslado de colegio')

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar estado' }),
    )

    await vi.waitFor(() =>
      expect(updateStudent).toHaveBeenCalledWith(18, {
        estado: 'retirado',
        motivo: 'Traslado de colegio',
      }),
    )
    await vi.waitFor(() => expect(onDone).toHaveBeenCalled())
  })

  it('envía motivo nulo cuando no se escribe', async () => {
    renderPanel()
    await userEvent.selectOptions(
      screen.getByLabelText('Nuevo estado'),
      'egresado',
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar estado' }),
    )

    await vi.waitFor(() =>
      expect(updateStudent).toHaveBeenCalledWith(18, {
        estado: 'egresado',
        motivo: null,
      }),
    )
  })
})
