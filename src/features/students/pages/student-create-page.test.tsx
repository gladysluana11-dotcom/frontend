import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import * as studentsApi from '../api/students-api'
import StudentCreatePage from './student-create-page'

vi.mock('../api/students-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/students-api')>()),
  createStudent: vi.fn(),
}))

const createStudent = vi.mocked(studentsApi.createStudent)

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/alumnos/nuevo']}>
        <Routes>
          <Route path="/alumnos/nuevo" element={<StudentCreatePage />} />
          <Route path="/alumnos/:id" element={<p>Ficha del alumno</p>} />
          <Route path="/alumnos" element={<p>Lista de alumnos</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

async function fillAndSubmit() {
  await userEvent.type(screen.getByLabelText('Nombres'), 'Ana')
  await userEvent.type(screen.getByLabelText('Apellidos'), 'Soto')
  await userEvent.type(screen.getByLabelText('Número de documento'), '12345678')
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), {
    target: { value: '2014-05-10' },
  })
  await userEvent.selectOptions(screen.getByLabelText('Sexo'), 'F')
  await userEvent.type(screen.getByLabelText('Dirección'), 'Jr. Ficticio 123')
  await userEvent.click(
    screen.getByRole('button', { name: 'Registrar alumno' }),
  )
}

beforeEach(() => vi.resetAllMocks())

describe('StudentCreatePage', () => {
  it('registra al alumno y abre su ficha', async () => {
    createStudent.mockResolvedValue({
      id: 41,
      nombre: 'Ana',
      apellido: 'Soto',
      estado: 'activo',
    })
    renderPage()

    await fillAndSubmit()

    expect(await screen.findByText('Ficha del alumno')).toBeInTheDocument()
    expect(createStudent).toHaveBeenCalledWith({
      nombre: 'Ana',
      apellido: 'Soto',
      tipo_documento: 'DNI',
      documento_identidad: '12345678',
      fecha_nacimiento: '2014-05-10',
      sexo: 'F',
      direccion: 'Jr. Ficticio 123',
    })
  })

  it('vuelve a la lista si la API no devuelve el alumno creado', async () => {
    createStudent.mockResolvedValue(undefined)
    renderPage()

    await fillAndSubmit()

    expect(await screen.findByText('Lista de alumnos')).toBeInTheDocument()
  })

  it('se queda en el formulario y marca el campo si el servidor rechaza los datos', async () => {
    createStudent.mockRejectedValue(
      new ApiError('Revisa los datos', {
        kind: 'validation',
        status: 422,
        errors: {
          documento_identidad: ['Ya existe un alumno con ese documento.'],
        },
      }),
    )
    renderPage()

    await fillAndSubmit()

    expect(
      await screen.findByText('Ya existe un alumno con ese documento.'),
    ).toBeInTheDocument()
    expect(screen.queryByText('Ficha del alumno')).not.toBeInTheDocument()
  })

  it('permite cancelar y volver a la lista', async () => {
    renderPage()

    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(await screen.findByText('Lista de alumnos')).toBeInTheDocument()
  })
})
