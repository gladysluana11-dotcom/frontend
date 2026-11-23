import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionRoles } from '../../../test/session'
import RequiredDocumentsPage from './required-documents-page'

const mocks = vi.hoisted(() => ({
  useRequiredDocuments: vi.fn(),
  create: { mutateAsync: vi.fn(), isPending: false },
  update: { mutateAsync: vi.fn(), isPending: false },
}))

vi.mock('../hooks/use-enrollments', () => ({
  useRequiredDocuments: mocks.useRequiredDocuments,
  useRequiredDocumentMutations: () => ({
    create: mocks.create,
    update: mocks.update,
  }),
}))

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, ['coordinacion'])
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <RequiredDocumentsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useRequiredDocuments.mockReturnValue({
    data: [{ id: 2, nombre: 'DNI', obligatorio: true, activo: true }],
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  })
  mocks.create.mutateAsync.mockResolvedValue(undefined)
  mocks.update.mutateAsync.mockResolvedValue(undefined)
})

describe('RequiredDocumentsPage', () => {
  it('permite editar un documento requerido', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Editar documento' }),
    )
    const name = screen.getByLabelText('Nombre del documento')
    await user.clear(name)
    await user.type(name, 'DNI del alumno')
    await user.click(screen.getByRole('button', { name: 'Guardar documento' }))

    expect(mocks.update.mutateAsync).toHaveBeenCalledWith({
      id: 2,
      values: { nombre: 'DNI del alumno', obligatorio: true, activo: true },
    })
  })

  it('valida con Zod antes de crear un documento', async () => {
    const user = userEvent.setup()
    renderPage()

    await user.click(
      await screen.findByRole('button', { name: 'Agregar documento' }),
    )
    await user.click(screen.getByRole('button', { name: 'Guardar documento' }))

    expect(
      await screen.findByText('Ingresa el nombre del documento.'),
    ).toBeInTheDocument()
    expect(mocks.create.mutateAsync).not.toHaveBeenCalled()
  })
})
