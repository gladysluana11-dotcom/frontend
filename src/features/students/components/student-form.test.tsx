import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/errors'
import { emptyStudentForm } from '../form-schemas'
import { StudentForm } from './student-form'

function renderForm(onSubmit = vi.fn().mockResolvedValue(undefined)) {
  render(
    <StudentForm
      initialValues={emptyStudentForm}
      submitLabel="Registrar alumno"
      onSubmit={onSubmit}
      onCancel={vi.fn()}
    />,
  )
  return onSubmit
}

async function fillValidForm() {
  await userEvent.type(screen.getByLabelText('Nombres'), 'Ana')
  await userEvent.type(screen.getByLabelText('Apellidos'), 'Soto')
  await userEvent.type(screen.getByLabelText('Número de documento'), '12345678')
  fireEvent.change(screen.getByLabelText('Fecha de nacimiento'), {
    target: { value: '2014-05-10' },
  })
  await userEvent.selectOptions(screen.getByLabelText('Sexo'), 'F')
  await userEvent.type(screen.getByLabelText('Dirección'), 'Jr. Ficticio 123')
}

describe('StudentForm', () => {
  it('muestra los errores de cada campo y no envía si faltan datos', async () => {
    const onSubmit = renderForm()

    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar alumno' }),
    )

    expect(
      await screen.findByText('Ingresa los nombres del alumno.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Ingresa los apellidos del alumno.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Ingresa el número de documento.'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Ingresa la fecha de nacimiento.'),
    ).toBeInTheDocument()
    expect(screen.getByText('Elige el sexo.')).toBeInTheDocument()
    expect(screen.getByText('Ingresa la dirección.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('valida el DNI de 8 dígitos', async () => {
    renderForm()
    await userEvent.type(screen.getByLabelText('Número de documento'), '123')

    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar alumno' }),
    )

    expect(
      await screen.findByText('El DNI debe tener 8 dígitos.'),
    ).toBeInTheDocument()
  })

  it('envía los datos escritos cuando el formulario es válido', async () => {
    const onSubmit = renderForm()
    await fillValidForm()

    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar alumno' }),
    )

    await vi.waitFor(() => expect(onSubmit).toHaveBeenCalledOnce())
    expect(onSubmit.mock.calls[0]?.[0]).toEqual({
      nombre: 'Ana',
      apellido: 'Soto',
      tipo_documento: 'DNI',
      documento_identidad: '12345678',
      fecha_nacimiento: '2014-05-10',
      sexo: 'F',
      direccion: 'Jr. Ficticio 123',
    })
  })

  it('muestra junto al campo el error que devuelve el servidor', async () => {
    const onSubmit = vi.fn().mockRejectedValue(
      new ApiError('Revisa los datos', {
        kind: 'validation',
        status: 422,
        errors: {
          documento_identidad: ['Ya existe un alumno con ese documento.'],
        },
      }),
    )
    renderForm(onSubmit)
    await fillValidForm()

    await userEvent.click(
      screen.getByRole('button', { name: 'Registrar alumno' }),
    )

    expect(
      await screen.findByText('Ya existe un alumno con ese documento.'),
    ).toBeInTheDocument()
  })

  it('no permite elegir una fecha futura desde el calendario', () => {
    renderForm()
    const max = screen.getByLabelText('Fecha de nacimiento').getAttribute('max')
    expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
