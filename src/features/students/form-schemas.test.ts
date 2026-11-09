import { describe, expect, it } from 'vitest'
import {
  guardianLinkSchema,
  guardianNewSchema,
  statusChangeSchema,
  studentFormSchema,
  validatePhotoFile,
} from './form-schemas'

const validStudent = {
  nombre: 'Ana',
  apellido: 'Soto',
  tipo_documento: 'DNI',
  documento_identidad: '12345678',
  fecha_nacimiento: '2014-05-10',
  sexo: 'F',
  direccion: 'Jr. Ficticio 123',
}

function messages(result: {
  success: boolean
  error?: { issues: { message: string }[] }
}) {
  return result.error?.issues.map((issue) => issue.message) ?? []
}

describe('studentFormSchema', () => {
  it('acepta un alumno válido', () => {
    expect(studentFormSchema.safeParse(validStudent).success).toBe(true)
  })

  it('exige todos los campos', () => {
    const result = studentFormSchema.safeParse({
      nombre: '',
      apellido: '',
      tipo_documento: '',
      documento_identidad: '',
      fecha_nacimiento: '',
      sexo: '',
      direccion: '',
    })
    expect(messages(result)).toEqual(
      expect.arrayContaining([
        'Ingresa los nombres del alumno.',
        'Ingresa los apellidos del alumno.',
        'Elige el tipo de documento.',
        'Ingresa el número de documento.',
        'Ingresa la fecha de nacimiento.',
        'Elige el sexo.',
        'Ingresa la dirección.',
      ]),
    )
  })

  it('exige 8 dígitos para el DNI', () => {
    for (const bad of ['1234567', '123456789', '1234567a']) {
      const result = studentFormSchema.safeParse({
        ...validStudent,
        documento_identidad: bad,
      })
      expect(messages(result)).toContain('El DNI debe tener 8 dígitos.')
    }
  })

  it('acepta otros documentos de 6 a 20 letras o números', () => {
    const ok = studentFormSchema.safeParse({
      ...validStudent,
      tipo_documento: 'CE',
      documento_identidad: 'AB123456',
    })
    expect(ok.success).toBe(true)

    const bad = studentFormSchema.safeParse({
      ...validStudent,
      tipo_documento: 'PASAPORTE',
      documento_identidad: 'AB 12',
    })
    expect(messages(bad)).toContain(
      'El documento debe tener entre 6 y 20 letras o números, sin espacios.',
    )
  })

  it('rechaza una fecha de nacimiento futura', () => {
    const result = studentFormSchema.safeParse({
      ...validStudent,
      fecha_nacimiento: '2999-01-01',
    })
    expect(messages(result)).toContain(
      'La fecha de nacimiento no puede ser futura.',
    )
  })

  it('rechaza un sexo que no sea M o F', () => {
    const result = studentFormSchema.safeParse({ ...validStudent, sexo: 'X' })
    expect(messages(result)).toContain('Elige el sexo.')
  })
})

describe('statusChangeSchema', () => {
  it('exige el motivo para retirar al alumno', () => {
    const result = statusChangeSchema.safeParse({
      estado: 'retirado',
      motivo: '  ',
    })
    expect(messages(result)).toContain('Indica el motivo del retiro.')
  })

  it('no exige motivo para otros estados', () => {
    expect(
      statusChangeSchema.safeParse({ estado: 'activo', motivo: '' }).success,
    ).toBe(true)
  })

  it('rechaza un estado inválido', () => {
    expect(
      statusChangeSchema.safeParse({ estado: 'otro', motivo: '' }).success,
    ).toBe(false)
  })
})

describe('esquemas de apoderado', () => {
  const link = {
    parentesco: 'Madre',
    telefono: '',
    email: '',
    responsable_pago: true,
  }

  it('acepta teléfono y correo vacíos', () => {
    expect(guardianLinkSchema.safeParse(link).success).toBe(true)
  })

  it('valida teléfono y correo cuando se escriben', () => {
    expect(
      guardianLinkSchema.safeParse({ ...link, telefono: 'abc' }).success,
    ).toBe(false)
    expect(
      guardianLinkSchema.safeParse({ ...link, email: 'no-es-correo' }).success,
    ).toBe(false)
    expect(
      guardianLinkSchema.safeParse({
        ...link,
        telefono: '+51 900 000 001',
        email: 'a@b.pe',
      }).success,
    ).toBe(true)
  })

  it('exige nombre, apellido y parentesco al crear', () => {
    const result = guardianNewSchema.safeParse({
      ...link,
      parentesco: '',
      nombre: '',
      apellido: '',
    })
    expect(messages(result)).toEqual(
      expect.arrayContaining([
        'Indica el parentesco.',
        'Ingresa los nombres del apoderado.',
        'Ingresa los apellidos del apoderado.',
      ]),
    )
  })
})

describe('validatePhotoFile', () => {
  const file = (type: string, size: number) =>
    new File([new Uint8Array(size)], 'foto', { type })

  it('acepta JPG y PNG de hasta 1 MB', () => {
    expect(validatePhotoFile(file('image/jpeg', 1000))).toBeNull()
    expect(validatePhotoFile(file('image/png', 1024 * 1024))).toBeNull()
  })

  it('rechaza otros tipos, archivos pesados y la ausencia de archivo', () => {
    expect(validatePhotoFile(file('image/gif', 1000))).toBe(
      'La foto debe ser JPG o PNG.',
    )
    expect(validatePhotoFile(file('image/png', 1024 * 1024 + 1))).toBe(
      'La foto no puede pesar más de 1 MB.',
    )
    expect(validatePhotoFile(undefined)).toBe(
      'Elige una imagen antes de subirla.',
    )
  })
})
