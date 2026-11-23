import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import { setSessionRoles } from '../../../test/session'
import EnrollmentCreatePage from './enrollment-create-page'

const mocks = vi.hoisted(() => ({
  useAcademicYears: vi.fn(),
  useLevels: vi.fn(),
  useGrades: vi.fn(),
  useSections: vi.fn(),
  useEnrollmentStudent: vi.fn(),
  useEnrollmentStudentSearch: vi.fn(),
  mutateAsync: vi.fn(),
}))

vi.mock('../hooks/use-enrollments', () => ({
  useCreateEnrollment: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
  useEnrollmentStudent: mocks.useEnrollmentStudent,
  useEnrollmentStudentSearch: mocks.useEnrollmentStudentSearch,
}))
vi.mock('../../catalog/hooks/use-catalog', () => ({
  useAcademicYears: mocks.useAcademicYears,
  useLevels: mocks.useLevels,
  useGrades: mocks.useGrades,
  useSections: mocks.useSections,
}))

const student = {
  id: 18,
  nombre: 'Samuel',
  apellido: 'Aguilar',
  documento: '90000018',
}

function renderPage(roles: string[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  setSessionRoles(client, roles)
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/matriculas/nueva?alumno_id=18']}>
        <Routes>
          <Route path="/matriculas/nueva" element={<EnrollmentCreatePage />} />
          <Route path="/matriculas/:id" element={<p>Detalle creado</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('Año escolar'), '2026')
  await user.selectOptions(screen.getByLabelText('Grado'), '9')
  await user.selectOptions(screen.getByLabelText('Sección'), '18')
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.useAcademicYears.mockReturnValue({
    data: [{ id: 2026, nombre: '2026', cerrado: false }],
  })
  mocks.useLevels.mockReturnValue({ data: [{ id: 2, nombre: 'Primaria' }] })
  mocks.useGrades.mockReturnValue({
    data: [{ id: 9, nivel_id: 2, nombre: 'Sexto' }],
  })
  mocks.useSections.mockReturnValue({
    data: [{ id: 18, anio_escolar_id: 2026, grado_id: 9, nombre: 'B' }],
  })
  mocks.useEnrollmentStudent.mockReturnValue({ data: student })
  mocks.useEnrollmentStudentSearch.mockReturnValue({
    data: undefined,
    isPending: false,
  })
})

describe('EnrollmentCreatePage', () => {
  it('permite al Director autorizar un exceso solo tras la respuesta de vacantes', async () => {
    const user = userEvent.setup()
    mocks.mutateAsync
      .mockRejectedValueOnce(
        new ApiError('No hay vacantes.', {
          kind: 'validation',
          status: 422,
          errors: { seccion_id: ['No hay vacantes disponibles.'] },
        }),
      )
      .mockResolvedValueOnce({ id: 22 })
    renderPage(['director'])
    await fillRequiredFields(user)

    await user.click(
      screen.getByRole('button', { name: 'Registrar matrícula' }),
    )
    const authorize = await screen.findByRole('checkbox', {
      name: 'Autorizar exceso de vacantes',
    })
    await user.click(authorize)
    await user.type(
      screen.getByLabelText('Motivo para autorizar el exceso'),
      'Continuidad escolar',
    )
    await user.click(
      screen.getByRole('button', { name: 'Registrar matrícula' }),
    )

    expect(await screen.findByText('Detalle creado')).toBeInTheDocument()
    expect(mocks.mutateAsync).toHaveBeenLastCalledWith(
      expect.objectContaining({
        alumno_id: 18,
        seccion_id: 18,
        autorizar_exceso: true,
        motivo_exceso: 'Continuidad escolar',
      }),
    )
  })

  it('muestra la falta de responsable de pago y enlaza a la ficha del alumno', async () => {
    const user = userEvent.setup()
    mocks.mutateAsync.mockRejectedValue(
      new ApiError('Datos inválidos.', {
        kind: 'validation',
        status: 422,
        errors: {
          alumno_id: ['El alumno necesita un apoderado responsable de pago.'],
        },
      }),
    )
    renderPage(['administrador'])
    await fillRequiredFields(user)
    await user.click(
      screen.getByRole('button', { name: 'Registrar matrícula' }),
    )

    expect(
      (await screen.findAllByText(/necesita un apoderado responsable de pago/i))
        .length,
    ).toBeGreaterThan(0)
    expect(
      screen.getByRole('link', { name: 'Ir a la ficha del alumno' }),
    ).toHaveAttribute('href', '/alumnos/18')
  })

  it('no ofrece autorizar exceso a Coordinación', async () => {
    const user = userEvent.setup()
    mocks.mutateAsync.mockRejectedValue(
      new ApiError('No hay vacantes.', {
        kind: 'validation',
        status: 422,
        errors: { seccion_id: ['No hay vacantes disponibles.'] },
      }),
    )
    renderPage(['coordinacion'])
    await fillRequiredFields(user)
    await user.click(
      screen.getByRole('button', { name: 'Registrar matrícula' }),
    )

    expect(
      (await screen.findAllByText('No hay vacantes disponibles.')).length,
    ).toBeGreaterThan(0)
    expect(
      screen.queryByRole('checkbox', { name: 'Autorizar exceso de vacantes' }),
    ).not.toBeInTheDocument()
  })
})
