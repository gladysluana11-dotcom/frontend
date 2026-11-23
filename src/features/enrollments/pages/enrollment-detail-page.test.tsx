import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { toast } from 'sonner'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setSessionRoles } from '../../../test/session'
import EnrollmentDetailPage from './enrollment-detail-page'

const mocks = vi.hoisted(() => ({
  useEnrollment: vi.fn(),
  useGrades: vi.fn(),
  useLevels: vi.fn(),
  useSections: vi.fn(),
  changeStatus: { mutateAsync: vi.fn(), isPending: false },
  changeSection: { mutateAsync: vi.fn(), isPending: false },
  updateDocument: { mutateAsync: vi.fn(), isPending: false },
  downloadFicha: { mutateAsync: vi.fn(), isPending: false },
}))

vi.mock('../hooks/use-enrollments', () => ({
  useEnrollment: mocks.useEnrollment,
  useEnrollmentMutations: () => ({
    changeStatus: mocks.changeStatus,
    changeSection: mocks.changeSection,
    updateDocument: mocks.updateDocument,
    downloadFicha: mocks.downloadFicha,
  }),
}))
vi.mock('../../catalog/hooks/use-catalog', () => ({
  useGrades: mocks.useGrades,
  useLevels: mocks.useLevels,
  useSections: mocks.useSections,
}))

const enrollment = {
  id: 18,
  alumno: { id: 18, nombre: 'Samuel', apellido: 'Aguilar' },
  anio_escolar_id: 2026,
  anio_escolar: '2026',
  grado_id: 9,
  grado: 'Sexto',
  seccion_id: 18,
  seccion: 'B',
  fecha_matricula: '2026-03-02',
  estado: 'matriculado',
  usuario_registro: { id: 2, nombre: 'Ana', apellido: 'Soto' },
  fecha_retiro: null,
  motivo: null,
  documentos: [
    {
      id: 3,
      documento_requerido_id: 2,
      nombre: 'DNI',
      estado: 'pendiente',
      fecha_entrega: null,
    },
  ],
}

function renderPage(roles: string[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/matriculas/18']}>
        <Routes>
          <Route path="/matriculas/:id" element={<EnrollmentDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useEnrollment.mockReturnValue({
    data: enrollment,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  })

  afterEach(() => vi.restoreAllMocks())
  mocks.useGrades.mockReturnValue({
    data: [{ id: 9, nivel_id: 2, nombre: 'Sexto' }],
  })
  mocks.useLevels.mockReturnValue({
    data: [{ id: 2, nombre: 'Primaria' }],
  })
  mocks.useSections.mockReturnValue({
    data: [{ id: 18, anio_escolar_id: 2026, grado_id: 9, nombre: 'B' }],
  })
  mocks.changeStatus.mutateAsync.mockResolvedValue({
    ...enrollment,
    estado: 'pendiente_documentos',
  })
  mocks.changeSection.mutateAsync.mockResolvedValue(enrollment)
  mocks.updateDocument.mutateAsync.mockResolvedValue(undefined)
  mocks.downloadFicha.mutateAsync.mockResolvedValue(undefined)
})

describe('EnrollmentDetailPage', () => {
  it('muestra datos y documentos; permite actualizar un documento y descargar la ficha', async () => {
    const user = userEvent.setup()
    renderPage(['docente'])

    expect(await screen.findByText('Aguilar, Samuel')).toBeInTheDocument()
    expect(screen.getByText('Ana Soto')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Marcar entregado' }))
    await waitFor(() =>
      expect(mocks.updateDocument.mutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId: 3,
          values: expect.objectContaining({ estado: 'entregado' }),
        }),
      ),
    )
    await user.click(
      screen.getByRole('button', { name: 'Descargar ficha PDF' }),
    )
    expect(mocks.downloadFicha.mutateAsync).toHaveBeenCalledWith(18)
    expect(
      screen.queryByRole('button', { name: 'Cambiar estado' }),
    ).not.toBeInTheDocument()
  })

  it('confirma antes de cambiar estado y muestra el estado que devolvió la API', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const warning = vi.spyOn(toast, 'warning')
    renderPage(['administrador'])

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar estado' }),
    )
    await user.selectOptions(screen.getByLabelText('Estado'), 'matriculado')
    await user.click(screen.getByRole('button', { name: 'Guardar estado' }))

    expect(confirm).toHaveBeenCalledOnce()
    expect(mocks.changeStatus.mutateAsync).toHaveBeenCalledWith({
      estado: 'matriculado',
    })
    expect(warning).toHaveBeenCalledWith(
      'La matrícula sigue pendiente de documentos porque faltan documentos obligatorios.',
    )
  })

  it('no envía el cambio de sección cuando se cancela la confirmación', async () => {
    const user = userEvent.setup()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderPage(['director'])

    await user.click(
      await screen.findByRole('button', { name: 'Cambiar de sección' }),
    )
    await user.type(screen.getByLabelText('Motivo'), 'Cambio solicitado')
    await user.click(screen.getByRole('button', { name: 'Guardar sección' }))

    expect(confirm).toHaveBeenCalledOnce()
    expect(mocks.changeSection.mutateAsync).not.toHaveBeenCalled()
  })
})
