import { z } from 'zod'

const nullableText = z.string().nullable().optional()

const enrollmentSummarySchema = z.object({
  anio_escolar_id: z.number().nullable().optional(),
  grado_id: z.number().nullable().optional(),
  seccion_id: z.number().nullable().optional(),
  anio_escolar: nullableText,
  grado: nullableText,
  seccion: nullableText,
  estado: nullableText,
})

export const studentListItemSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  apellido: z.string(),
  documento: nullableText,
  estado: z.string(),
  matricula_actual: enrollmentSummarySchema.nullable().optional(),
})

const guardianSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  apellido: z.string(),
  parentesco: nullableText,
  telefono: nullableText,
  email: nullableText,
  responsable_pago: z.boolean().nullable().optional(),
})

export const studentDetailSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  apellido: z.string(),
  tipo_documento: nullableText,
  documento_identidad: nullableText,
  fecha_nacimiento: nullableText,
  sexo: nullableText,
  direccion: nullableText,
  foto_url: nullableText,
  estado: z.string(),
  /** Aún no viene en la respuesta de la API; cuando se agregue, se muestra sin más cambios. */
  apoderados: z.array(guardianSchema).optional(),
})

const enrollmentHistorySchema = z.object({
  id: z.number(),
  anio_escolar: nullableText,
  grado: nullableText,
  seccion: nullableText,
  fecha_matricula: nullableText,
  estado: nullableText,
  fecha_retiro: nullableText,
  motivo: nullableText,
})

const statusChangeSchema = z.object({
  estado_anterior: nullableText,
  estado_nuevo: nullableText,
  motivo: nullableText,
  fecha: nullableText,
})

const enrollmentChangeSchema = z.object({
  evento: nullableText,
  estado_anterior: nullableText,
  estado_nuevo: nullableText,
  motivo: nullableText,
  fecha: nullableText,
})

export const studentHistorySchema = z.object({
  matriculas: z.array(enrollmentHistorySchema),
  cambios_estado: z.array(statusChangeSchema),
  cambios_matricula: z.array(enrollmentChangeSchema),
})

export const guardianListItemSchema = guardianSchema

export type Guardian = z.infer<typeof guardianSchema>
export type StudentListItem = z.infer<typeof studentListItemSchema>
export type StudentDetail = z.infer<typeof studentDetailSchema>
export type StudentHistory = z.infer<typeof studentHistorySchema>
