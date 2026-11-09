import { studentFormFields, type StudentFormValues } from '../form-schemas'
import type { StudentDetail } from '../schemas'

export function toFormValues(student: StudentDetail): StudentFormValues {
  return {
    nombre: student.nombre,
    apellido: student.apellido,
    tipo_documento: student.tipo_documento || 'DNI',
    documento_identidad: student.documento_identidad ?? '',
    fecha_nacimiento: (student.fecha_nacimiento ?? '').slice(0, 10),
    sexo: student.sexo ?? '',
    direccion: student.direccion ?? '',
  }
}

/** Solo se envían a la API los campos que cambiaron. */
export function changedFields(
  initial: StudentFormValues,
  values: StudentFormValues,
): Partial<StudentFormValues> {
  const changes: Partial<StudentFormValues> = {}
  for (const field of studentFormFields) {
    if (values[field] !== initial[field]) changes[field] = values[field]
  }
  return changes
}
