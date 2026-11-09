import { describe, expect, it } from 'vitest'
import type { StudentDetail } from '../schemas'
import { changedFields, toFormValues } from './form-values'

const student: StudentDetail = {
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

describe('toFormValues', () => {
  it('convierte la ficha en valores del formulario', () => {
    expect(toFormValues(student)).toEqual({
      nombre: 'Samuel',
      apellido: 'Aguilar',
      tipo_documento: 'DNI',
      documento_identidad: '90000018',
      fecha_nacimiento: '2013-06-18',
      sexo: 'M',
      direccion: 'Dirección ficticia 18',
    })
  })

  it('recorta las fechas con hora y completa los datos que faltan', () => {
    const values = toFormValues({
      ...student,
      tipo_documento: null,
      fecha_nacimiento: '2013-06-18T00:00:00.000000Z',
      sexo: null,
      direccion: undefined,
    })
    expect(values.tipo_documento).toBe('DNI')
    expect(values.fecha_nacimiento).toBe('2013-06-18')
    expect(values.sexo).toBe('')
    expect(values.direccion).toBe('')
  })
})

describe('changedFields', () => {
  it('devuelve solo los campos que cambiaron', () => {
    const initial = toFormValues(student)
    expect(
      changedFields(initial, {
        ...initial,
        direccion: 'Otra dirección',
        sexo: 'F',
      }),
    ).toEqual({
      direccion: 'Otra dirección',
      sexo: 'F',
    })
  })

  it('devuelve vacío si no hay cambios', () => {
    const initial = toFormValues(student)
    expect(changedFields(initial, { ...initial })).toEqual({})
  })
})
