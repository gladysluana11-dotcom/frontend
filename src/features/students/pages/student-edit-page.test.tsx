import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import * as studentsApi from '../api/students-api'
import StudentEditPage from './student-edit-page'

vi.mock('../api/students-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/students-api')>()),
  getStudent: vi.fn(),
  updateStudent: vi.fn(),
}))

const getStudent = vi.mocked(studentsApi.getStudent)
const updateStudent = vi.mocked(studentsApi.updateStudent)

const student = {
  id: 18,
  nombre: 'Samuel',
  apellido: 'Aguilar',
  tipo_documento: 'DNI',
  documento_identidad: '90000018',
  fecha_nacimiento: '2013-06-18',
  sexo: 'M',
  direccion: 'Dirección ficticia 18',
  foto_url: null,
  estado: 'activo',
}

function renderPage(url = '/alumnos/18/editar') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/alumnos/:id/editar" element={<StudentEditPage />} />
          <Route path="/alumnos/:id" element={<p>Ficha del alumno</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  getStudent.mockResolvedValue(student)
  updateStudent.mockResolvedValue(undefined)
})

describe('StudentEditPage', () => {
  it('carga los datos actuales del alumno en el formulario', async () => {
    renderPage()

    expect(await screen.findByDisplayValue('Samuel')).toBeInTheDocument()
    expect(screen.getByDisplayValue('90000018')).toBeInTheDocument()
    expect(screen.getByDisplayValue('2013-06-18')).toBeInTheDocument()
    expect(
      screen.getByDisplayValue('Dirección ficticia 18'),
    ).toBeInTheDocument()
  })

  it('envía a la API solo los campos que cambiaron', async () => {
    renderPage()
    const address = await screen.findByLabelText('Dirección')

    await userEvent.clear(address)
    await userEvent.type(address, 'Nueva dirección 99')
    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ficha del alumno')).toBeInTheDocument()
    expect(updateStudent).toHaveBeenCalledWith(18, {
      direccion: 'Nueva dirección 99',
    })
  })

  it('no llama a la API si no hay cambios', async () => {
    renderPage()
    await screen.findByDisplayValue('Samuel')

    await userEvent.click(screen.getByRole('button', { name: 'Guardar' }))

    expect(await screen.findByText('Ficha del alumno')).toBeInTheDocument()
    expect(updateStudent).not.toHaveBeenCalled()
  })

  it('avisa cuando el alumno no existe', async () => {
    getStudent.mockRejectedValue(
      new ApiError('No encontrado', { kind: 'http', status: 404 }),
    )
    renderPage()

    expect(
      await screen.findByText(
        'El alumno no existe o no tienes acceso a su ficha.',
      ),
    ).toBeInTheDocument()
  })
})
