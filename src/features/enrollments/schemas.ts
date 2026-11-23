import { z } from 'zod'
import { dateInputToday } from '../../shared/utils/format'
import { texts } from '../../shared/texts'

export const ENROLLMENT_STATUSES = [
  'pre_inscrito',
  'pendiente_documentos',
  'matriculado',
  'retirado',
  'anulado',
] as const

const nullableText = z.string().nullable().optional()

const studentSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  apellido: z.string(),
})

export const enrollmentListItemSchema = z.object({
  id: z.number(),
  alumno: studentSchema,
  anio_escolar_id: z.number(),
  anio_escolar: nullableText,
  grado_id: z.number(),
  grado: nullableText,
  seccion_id: z.number(),
  seccion: nullableText,
  fecha_matricula: z.string(),
  estado: z.enum(ENROLLMENT_STATUSES),
  usuario_id: z.number().nullable().optional(),
  usuario_registro: z
    .object({
      id: z.number(),
      nombre: z.string(),
      apellido: z.string(),
    })
    .nullable()
    .optional(),
  fecha_retiro: nullableText,
  motivo: nullableText,
})

export const enrollmentDocumentSchema = z.object({
  id: z.number(),
  documento_requerido_id: z.number(),
  nombre: z.string(),
  estado: z.enum(['pendiente', 'entregado']),
  fecha_entrega: nullableText,
})

export const enrollmentSchema = enrollmentListItemSchema.extend({
  documentos: z.array(enrollmentDocumentSchema),
})

export const enrollmentMutationSchema = enrollmentListItemSchema.extend({
  documentos: z.array(enrollmentDocumentSchema).optional(),
})

export const requiredDocumentSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  obligatorio: z.boolean(),
  activo: z.boolean(),
})

export const enrollmentStudentSchema = studentSchema.extend({
  documento: nullableText,
  estado: nullableText,
  matricula_actual: z
    .object({
      id: z.number().optional(),
      anio_escolar_id: z.number().nullable().optional(),
      grado_id: z.number().nullable().optional(),
      seccion_id: z.number().nullable().optional(),
      anio_escolar: nullableText,
      grado: nullableText,
      seccion: nullableText,
      estado: nullableText,
    })
    .nullable()
    .optional(),
})

const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, texts.enrollments.fieldErrors.date)
  .refine((value) => {
    const [year, month, day] = value.split('-').map(Number)
    const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0))
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === (month ?? 1) - 1 &&
      date.getUTCDate() === day
    )
  }, texts.enrollments.fieldErrors.date)
  .refine(
    (value) => value <= dateInputToday(),
    texts.enrollments.fieldErrors.date,
  )

export const createEnrollmentSchema = z
  .object({
    alumno_id: z.string().min(1, texts.enrollments.fieldErrors.student),
    anio_escolar_id: z.string().min(1, texts.enrollments.fieldErrors.year),
    grado_id: z.string().min(1, texts.enrollments.fieldErrors.grade),
    seccion_id: z.string().min(1, texts.enrollments.fieldErrors.section),
    fecha_matricula: dateSchema,
    estado: z.enum(['pre_inscrito', 'pendiente_documentos', 'matriculado']),
    autorizar_exceso: z.boolean(),
    motivo_exceso: z
      .string()
      .max(1000, texts.enrollments.fieldErrors.reasonTooLong),
  })
  .superRefine((values, context) => {
    if (values.autorizar_exceso && values.motivo_exceso.trim() === '') {
      context.addIssue({
        code: 'custom',
        path: ['motivo_exceso'],
        message: texts.enrollments.fieldErrors.excessReason,
      })
    }
  })

export const enrollmentStatusSchema = z
  .object({
    estado: z.enum(ENROLLMENT_STATUSES),
    motivo: z.string().max(1000, texts.enrollments.fieldErrors.reasonTooLong),
    fecha_retiro: z.string(),
  })
  .superRefine((values, context) => {
    if (values.estado === 'retirado' || values.estado === 'anulado') {
      if (values.motivo.trim() === '') {
        context.addIssue({
          code: 'custom',
          path: ['motivo'],
          message: texts.enrollments.fieldErrors.reason,
        })
      }
    }
    if (values.estado === 'retirado') {
      const result = dateSchema.safeParse(values.fecha_retiro)
      if (!result.success) {
        context.addIssue({
          code: 'custom',
          path: ['fecha_retiro'],
          message:
            result.error.issues[0]?.message ??
            texts.enrollments.fieldErrors.date,
        })
      }
    }
  })

export const changeSectionSchema = z
  .object({
    grado_id: z.string().min(1, texts.enrollments.fieldErrors.grade),
    seccion_id: z.string().min(1, texts.enrollments.fieldErrors.section),
    motivo: z
      .string()
      .trim()
      .min(1, texts.enrollments.fieldErrors.reason)
      .max(1000, texts.enrollments.fieldErrors.reasonTooLong),
    fecha: dateSchema,
    autorizar_exceso: z.boolean(),
    motivo_exceso: z
      .string()
      .max(1000, texts.enrollments.fieldErrors.reasonTooLong),
  })
  .superRefine((values, context) => {
    if (values.autorizar_exceso && values.motivo_exceso.trim() === '') {
      context.addIssue({
        code: 'custom',
        path: ['motivo_exceso'],
        message: texts.enrollments.fieldErrors.excessReason,
      })
    }
  })

export const enrollmentDocumentUpdateSchema = z
  .object({
    estado: z.enum(['pendiente', 'entregado']),
    fecha_entrega: z.string(),
  })
  .superRefine((values, context) => {
    if (values.estado === 'entregado') {
      const result = dateSchema.safeParse(values.fecha_entrega)
      if (!result.success) {
        context.addIssue({
          code: 'custom',
          path: ['fecha_entrega'],
          message:
            result.error.issues[0]?.message ??
            texts.enrollments.fieldErrors.date,
        })
      }
    }
  })

export const requiredDocumentFormSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, texts.enrollments.fieldErrors.documentName)
    .max(120, texts.enrollments.fieldErrors.documentNameTooLong),
  obligatorio: z.boolean(),
  activo: z.boolean(),
})

export type Enrollment = z.infer<typeof enrollmentSchema>
export type EnrollmentMutation = z.infer<typeof enrollmentMutationSchema>
export type EnrollmentListItem = z.infer<typeof enrollmentListItemSchema>
export type EnrollmentDocument = z.infer<typeof enrollmentDocumentSchema>
export type RequiredDocument = z.infer<typeof requiredDocumentSchema>
export type EnrollmentStudent = z.infer<typeof enrollmentStudentSchema>
export type CreateEnrollmentValues = z.infer<typeof createEnrollmentSchema>
export type EnrollmentStatusValues = z.infer<typeof enrollmentStatusSchema>
export type ChangeSectionValues = z.infer<typeof changeSectionSchema>
export type EnrollmentDocumentUpdateValues = z.infer<
  typeof enrollmentDocumentUpdateSchema
>
export type RequiredDocumentFormValues = z.infer<
  typeof requiredDocumentFormSchema
>
