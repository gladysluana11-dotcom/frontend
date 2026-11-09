import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as studentsApi from '../api/students-api'
import type { Guardian } from '../schemas'
import { GuardiansCard } from './guardians-card'

vi.mock('../api/students-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/students-api')>()),
  createGuardian: vi.fn(),
  linkGuardian: vi.fn(),
  searchGuardians: vi.fn(),
}))

const createGuardian = vi.mocked(studentsApi.createGuardian)
const linkGuardian = vi.mocked(studentsApi.linkGuardian)
const searchGuardians = vi.mocked(studentsApi.searchGuardians)

function renderCard(
  props: { guardians?: Guardian[] | undefined; canEdit?: boolean } = {},
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <GuardiansCard
        studentId={18}
        guardians={props.guardians}
        canEdit={props.canEdit ?? true}
      />
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  createGuardian.mockResolvedValue(undefined)
  linkGuardian.mockResolvedValue(undefined)
  searchGuardians.mockResolvedValue({
    items: [
      { id: 5, nombre: 'Rosa', apellido: 'Familia 1' },
      { id: 6, nombre: 'Luis', apellido: 'Familia 2' },
    ],
    pagination: { page: 1, perPage: 10, total: 2, lastPage: 1 },
  })
})

describe('GuardiansCard', () => {
  it('avisa que la lista aún no está disponible cuando la API no la entrega', () => {
    renderCard({ guardians: undefined })
    expect(
      screen.getByText(/se mostrará aquí cuando el servicio la incluya/i),
    ).toBeInTheDocument()
  })

  it('muestra la lista de apoderados con la marca de responsable de pago', () => {
    renderCard({
      guardians: [
        {
          id: 1,
          nombre: 'Rosa',
          apellido: 'Vega',
          parentesco: 'Madre',
          telefono: '900000001',
          responsable_pago: true,
        },
      ],
    })

    expect(screen.getByText('Vega, Rosa')).toBeInTheDocument()
    expect(screen.getByText('Madre')).toBeInTheDocument()
    expect(screen.getByText('Responsable de pago')).toBeInTheDocument()
  })

  it('oculta las acciones a quien no puede editar', () => {
    renderCard({ canEdit: false })
    expect(
      screen.queryByRole('button', { name: 'Agregar apoderado nuevo' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Vincular uno existente' }),
    ).not.toBeInTheDocument()
  })

  it('valida el formulario de apoderado nuevo', async () => {
    renderCard()
    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar apoderado nuevo' }),
    )

    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar apoderado' }),
    )

    expect(
      await screen.findByText('Ingresa los nombres del apoderado.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Indica el parentesco.')).toBeInTheDocument()
    expect(createGuardian).not.toHaveBeenCalled()
  })

  it('crea y vincula un apoderado nuevo', async () => {
    renderCard()
    await userEvent.click(
      screen.getByRole('button', { name: 'Agregar apoderado nuevo' }),
    )

    await userEvent.type(screen.getByLabelText('Nombres'), 'Rosa')
    await userEvent.type(screen.getByLabelText('Apellidos'), 'Vega')
    await userEvent.type(screen.getByLabelText('Parentesco'), 'Madre')
    await userEvent.type(
      screen.getByLabelText('Teléfono (opcional)'),
      '900000001',
    )
    await userEvent.click(screen.getByLabelText('Es el responsable de pago'))
    await userEvent.click(
      screen.getByRole('button', { name: 'Guardar apoderado' }),
    )

    await vi.waitFor(() =>
      expect(createGuardian).toHaveBeenCalledWith(18, {
        nombre: 'Rosa',
        apellido: 'Vega',
        parentesco: 'Madre',
        telefono: '900000001',
        email: '',
        responsable_pago: true,
      }),
    )
    await vi.waitFor(() =>
      expect(
        screen.queryByRole('form', { name: 'Agregar apoderado nuevo' }),
      ).not.toBeInTheDocument(),
    )
  })

  it('busca apoderados existentes y los vincula', async () => {
    renderCard()
    await userEvent.click(
      screen.getByRole('button', { name: 'Vincular uno existente' }),
    )

    await userEvent.type(
      screen.getByLabelText('Buscar apoderado por nombre'),
      'Fam',
    )
    await userEvent.click(await screen.findByLabelText('Familia 1, Rosa'))
    await userEvent.type(screen.getByLabelText('Parentesco'), 'Tía')
    await userEvent.click(
      screen.getByRole('button', { name: 'Vincular apoderado' }),
    )

    await vi.waitFor(() =>
      expect(linkGuardian).toHaveBeenCalledWith(18, 5, {
        parentesco: 'Tía',
        telefono: '',
        email: '',
        responsable_pago: false,
      }),
    )
    expect(searchGuardians).toHaveBeenCalledWith('Fam')
  })

  it('pide elegir un apoderado de la lista antes de vincular', async () => {
    renderCard()
    await userEvent.click(
      screen.getByRole('button', { name: 'Vincular uno existente' }),
    )
    await userEvent.type(screen.getByLabelText('Parentesco'), 'Tía')

    await userEvent.click(
      screen.getByRole('button', { name: 'Vincular apoderado' }),
    )

    expect(
      await screen.findByText('Elige un apoderado de la lista.'),
    ).toBeInTheDocument()
    expect(linkGuardian).not.toHaveBeenCalled()
  })
})
