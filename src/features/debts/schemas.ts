import { z } from 'zod'
import { texts } from '../../shared/texts'
import { moneyToCents, normalizeMoney } from '../payments/money'
import { todayInPeru } from '../payments/schemas'

const moneySchema = z
  .union([z.number(), z.string()])
  .transform((value) => normalizeMoney(value))

export const debtSchema = z.object({
  alumno_id: z.number(),
  nombre: z.string(),
  apellido: z.string(),
  nivel: z.string().nullable(),
  grado: z.string().nullable(),
  seccion: z.string().nullable(),
  total_vencido: moneySchema,
  total_pendiente: moneySchema,
  cuotas_vencidas: z.number().int(),
  dias_atraso: z.number().int(),
  apoderado_responsable_pago: z
    .object({
      nombre: z.string(),
      apellido: z.string(),
      telefono: z.string().nullable(),
      email: z.string().nullable(),
    })
    .nullable(),
})

export const debtPageSchema = z.object({
  deudas: z.array(debtSchema),
  paginacion: z.object({
    pagina: z.number().int(),
    por_pagina: z.number().int(),
    total: z.number().int(),
    ultima_pagina: z.number().int(),
  }),
})

export const debtSectionSchema = z.object({
  seccion_id: z.number(),
  nivel: z.string().nullable(),
  grado: z.string().nullable(),
  seccion: z.string().nullable(),
  cantidad_alumnos: z.number().int(),
  total_vencido: moneySchema,
  total_pendiente: moneySchema,
  alumnos: z.array(debtSchema),
})

export const debtByClassSchema = z.object({
  secciones: z.array(debtSectionSchema),
  filtros: z.record(z.string(), z.unknown()).optional(),
})

export const collectionSchema = z.object({
  id: z.number(),
  alumno_id: z.number(),
  usuario_id: z.number(),
  usuario: z.string(),
  fecha: z.string(),
  medio_contacto: z.enum(['llamada', 'whatsapp', 'presencial', 'correo']),
  resultado: z.string(),
  compromiso_pago_fecha: z.string().nullable(),
  compromiso_monto: moneySchema.nullable(),
  observacion: z.string().nullable(),
})

const optionalDate = z.string().optional().or(z.literal(''))

const optionalAmount = z
  .string()
  .optional()
  .or(z.literal(''))
  .refine(
    (value) =>
      !value || (moneyToCents(value) !== undefined && Number(value) > 0),
    { message: texts.debts.validation.commitmentAmount },
  )
  .refine((value) => !value || (moneyToCents(value) ?? 0) <= 9_999_999_999, {
    message: texts.payments.validation.amountMaximum,
  })

export const collectionFormSchema = z.object({
  fecha: z
    .string()
    .min(1, texts.debts.validation.dateRequired)
    .refine((value) => value <= todayInPeru(), {
      message: texts.debts.validation.dateFuture,
    }),
  medio_contacto: z.enum(['llamada', 'whatsapp', 'presencial', 'correo'], {
    error: texts.debts.validation.methodRequired,
  }),
  resultado: z
    .string()
    .trim()
    .min(1, texts.debts.validation.resultRequired)
    .max(100, texts.debts.validation.resultMaximum),
  compromiso_pago_fecha: optionalDate,
  compromiso_monto: optionalAmount,
  observacion: z.string().trim().max(2000).optional(),
})

export const debtAlertsSchema = z.object({
  dias_configurados: z.number().int(),
  por_vencer: z.object({
    cantidad: z.number().int(),
    monto: moneySchema,
  }),
  vencidas: z.object({
    cantidad: z.number().int(),
    monto: moneySchema,
  }),
})

export type Debt = z.infer<typeof debtSchema>
export type DebtSection = z.infer<typeof debtSectionSchema>
export type Collection = z.infer<typeof collectionSchema>
export type CollectionFormValues = z.infer<typeof collectionFormSchema>
export type DebtAlerts = z.infer<typeof debtAlertsSchema>
