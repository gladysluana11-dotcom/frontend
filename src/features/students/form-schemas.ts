import { z } from 'zod'
import { texts } from '../../shared/texts'

const f = texts.studentsForm

function todayAsText(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export const studentFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(1, f.errors.firstName)
      .max(255, f.errors.tooLong),
    apellido: z
      .string()
      .trim()
      .min(1, f.errors.lastName)
      .max(255, f.errors.tooLong),
    tipo_documento: z.string().min(1, f.errors.documentType),
    documento_identidad: z
      .string()
      .trim()
      .min(1, f.errors.documentNumber)
      .max(30, f.errors.tooLong),
    fecha_nacimiento: z.string().min(1, f.errors.birthDate),
    sexo: z
      .string()
      .refine((value): boolean => value === 'M' || value === 'F', f.errors.sex),
    direccion: z
      .string()
      .trim()
      .min(1, f.errors.address)
      .max(255, f.errors.tooLong),
  })
  .superRefine((values, context) => {
    const document = values.documento_identidad
    if (document) {
      if (values.tipo_documento === 'DNI' && !/^\d{8}$/.test(document)) {
        context.addIssue({
          code: 'custom',
          path: ['documento_identidad'],
          message: f.errors.dni,
        })
      } else if (
        values.tipo_documento !== 'DNI' &&
        values.tipo_documento !== '' &&
        !/^[A-Za-z0-9]{6,20}$/.test(document)
      ) {
        context.addIssue({
          code: 'custom',
          path: ['documento_identidad'],
          message: f.errors.otherDocument,
        })
      }
    }
    if (values.fecha_nacimiento && values.fecha_nacimiento > todayAsText()) {
      context.addIssue({
        code: 'custom',
        path: ['fecha_nacimiento'],
        message: f.errors.birthDateFuture,
      })
    }
  })

export type StudentFormValues = z.infer<typeof studentFormSchema>

export const studentFormFields = [
  'nombre',
  'apellido',
  'tipo_documento',
  'documento_identidad',
  'fecha_nacimiento',
  'sexo',
  'direccion',
] as const

export const emptyStudentForm: StudentFormValues = {
  nombre: '',
  apellido: '',
  tipo_documento: 'DNI',
  documento_identidad: '',
  fecha_nacimiento: '',
  sexo: '',
  direccion: '',
}

export const statusChangeSchema = z
  .object({
    estado: z
      .string()
      .refine(
        (value) => ['activo', 'retirado', 'egresado'].includes(value),
        f.statusChoose,
      ),
    motivo: z.string().trim().max(1000, f.statusReasonTooLong),
  })
  .refine(
    (values) => values.estado !== 'retirado' || values.motivo.length > 0,
    {
      message: f.statusReasonRequired,
      path: ['motivo'],
    },
  )

export type StatusChangeValues = z.infer<typeof statusChangeSchema>

const g = f.guardianErrors

const optionalPhone = z
  .string()
  .trim()
  .refine((value) => value === '' || /^[0-9+\s-]{6,30}$/.test(value), g.phone)

const optionalEmail = z
  .string()
  .trim()
  .max(255, f.errors.tooLong)
  .refine(
    (value) => value === '' || z.email().safeParse(value).success,
    g.email,
  )

export const guardianLinkSchema = z.object({
  parentesco: z
    .string()
    .trim()
    .min(1, g.relationship)
    .max(80, f.errors.tooLong),
  telefono: optionalPhone,
  email: optionalEmail,
  responsable_pago: z.boolean(),
})

export const guardianNewSchema = guardianLinkSchema.extend({
  nombre: z.string().trim().min(1, g.firstName).max(255, f.errors.tooLong),
  apellido: z.string().trim().min(1, g.lastName).max(255, f.errors.tooLong),
})

export type GuardianLinkValues = z.infer<typeof guardianLinkSchema>
export type GuardianNewValues = z.infer<typeof guardianNewSchema>

const PHOTO_TYPES = ['image/jpeg', 'image/png']
const PHOTO_MAX_BYTES = 1024 * 1024

/** Revisa el archivo antes de subirlo. El servidor vuelve a validar el tipo real. */
export function validatePhotoFile(file: File | undefined): string | null {
  if (!file) return f.photoRequired
  if (!PHOTO_TYPES.includes(file.type)) return f.photoErrorType
  if (file.size > PHOTO_MAX_BYTES) return f.photoErrorSize
  return null
}
