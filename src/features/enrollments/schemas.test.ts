import { describe, expect, it } from 'vitest'
import {
  changeSectionSchema,
  createEnrollmentSchema,
  enrollmentDocumentUpdateSchema,
  enrollmentSchema,
  enrollmentStatusSchema,
  requiredDocumentFormSchema,
} from './schemas'

const createValues = {
  alumno_id: '18',
  anio_escolar_id: '1',
  grado_id: '9',
  seccion_id: '18',
  fecha_matricula: '2026-03-02',
  estado: 'matriculado' as const,
  autorizar_exceso: false,
  motivo_exceso: '',
}

describe('esquemas de matrícula', () => {
  it('valida una respuesta de detalle y los documentos anidados', () => {
    expect(
      enrollmentSchema.safeParse({
        id: 18,
        alumno: { id: 18, nombre: 'Samuel', apellido: 'Aguilar' },
        anio_escolar_id: 1,
        anio_escolar: '2026',
        grado_id: 9,
        grado: '6.°',
        seccion_id: 18,
        seccion: 'B',
        fecha_matricula: '2026-03-02',
        estado: 'matriculado',
        documentos: [
          {
            id: 3,
            documento_requerido_id: 2,
            nombre: 'DNI',
            estado: 'entregado',
            fecha_entrega: '2026-03-02',
          },
        ],
      }).success,
    ).toBe(true)
  })

  it('exige motivo para autorizar el exceso y rechaza fechas futuras', () => {
    expect(
      createEnrollmentSchema.safeParse({
        ...createValues,
        autorizar_exceso: true,
        motivo_exceso: '',
      }).success,
    ).toBe(false)
    expect(
      createEnrollmentSchema.safeParse({
        ...createValues,
        fecha_matricula: '2999-01-01',
      }).success,
    ).toBe(false)
  })

  it('exige motivo y fecha al retirar, y motivo al anular', () => {
    expect(
      enrollmentStatusSchema.safeParse({
        estado: 'retirado',
        motivo: '',
        fecha_retiro: '2026-03-02',
      }).success,
    ).toBe(false)
    expect(
      enrollmentStatusSchema.safeParse({
        estado: 'anulado',
        motivo: '',
        fecha_retiro: '',
      }).success,
    ).toBe(false)
  })

  it('valida la fecha, motivo y exceso al cambiar de sección', () => {
    expect(
      changeSectionSchema.safeParse({
        grado_id: '9',
        seccion_id: '18',
        motivo: '',
        fecha: '2026-03-02',
        autorizar_exceso: true,
        motivo_exceso: '',
      }).success,
    ).toBe(false)
  })

  it('solo permite entregar documentos con una fecha no futura', () => {
    expect(
      enrollmentDocumentUpdateSchema.safeParse({
        estado: 'entregado',
        fecha_entrega: '2999-01-01',
      }).success,
    ).toBe(false)
    expect(
      enrollmentDocumentUpdateSchema.safeParse({
        estado: 'pendiente',
        fecha_entrega: '',
      }).success,
    ).toBe(true)
  })

  it('valida el nombre de documentos requeridos', () => {
    expect(
      requiredDocumentFormSchema.safeParse({
        nombre: ' ',
        obligatorio: true,
        activo: true,
      }).success,
    ).toBe(false)
  })
})
