import { z } from 'zod'
import { texts } from '../../shared/texts'
import { moneyToCents, normalizeMoney } from '../payments/money'
import { todayInPeru } from '../payments/schemas'

const moneySchema = z
  .union([z.number(), z.string()])
  .transform((value) => normalizeMoney(value))

const booleanLikeSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value
  const normalized = value.toLowerCase()
  if (['1', 'true', 'sí', 'si', 'cerrado'].includes(normalized)) return true
  if (['0', 'false', 'no', 'abierto'].includes(normalized)) return false
  return value
}, z.boolean())

export const academicYearSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  cerrado: booleanLikeSchema,
  activo: booleanLikeSchema.optional(),
})

export const academicLevelSchema = z.object({
  id: z.number(),
  nombre: z.string(),
})

export const gradeSchema = z
  .object({
    id: z.number(),
    nombre: z.string(),
    nivel_id: z.number().optional(),
    nivel: z
      .union([
        z.string(),
        z.object({ id: z.number().optional(), nombre: z.string() }),
      ])
      .nullable()
      .optional(),
  })
  .superRefine((grade, context) => {
    if (!grade.nivel_id && !grade.nivel) {
      context.addIssue({
        code: 'custom',
        path: ['nivel'],
        message: texts.payments.fees.invalidGrade,
      })
    }
  })

const moneyInputSchema = (minimum: number) =>
  z
    .string()
    .trim()
    .refine((value) => moneyToCents(value) !== undefined, {
      message: texts.payments.fees.validation.moneyDecimals,
    })
    .refine((value) => (moneyToCents(value) ?? -1) >= minimum, {
      message:
        minimum > 0
          ? texts.payments.fees.validation.discountValue
          : texts.payments.fees.validation.moneyMinimum,
    })
    .refine((value) => (moneyToCents(value) ?? 0) <= 9_999_999_999, {
      message: texts.payments.fees.validation.moneyMaximum,
    })

export const tariffSchema = z.object({
  id: z.number(),
  anio_escolar_id: z.number(),
  grado_id: z.number(),
  grado: z.string().optional(),
  monto_matricula: moneySchema,
  monto_pension: moneySchema,
  numero_cuotas: z.number().int().min(1).max(12),
  dia_vencimiento: z.number().int().min(1).max(28),
  mes_primera_pension: z.number().int().min(1).max(12),
})

export const discountSchema = z.object({
  id: z.number(),
  cuota_id: z.number(),
  tipo: z.enum(['beca', 'descuento', 'exoneracion']),
  modo: z.enum(['monto', 'porcentaje']),
  valor: moneySchema,
  monto_calculado: moneySchema,
  motivo: z.string(),
  usuario_id: z.number(),
  anulada_en: z.string().nullable(),
  motivo_anulacion: z.string().nullable(),
})

export const cashSummarySchema = z.object({
  fecha: z.string(),
  total: moneySchema,
  cantidad_pagos: z.number().int().nonnegative(),
  por_usuario: z.array(
    z.object({
      usuario_id: z.number(),
      usuario: z.string(),
      cantidad: z.number().int().nonnegative(),
      total: moneySchema,
    }),
  ),
  por_medio: z.array(
    z.object({
      medio: z.string(),
      cantidad: z.number().int().nonnegative(),
      total: moneySchema,
    }),
  ),
})

export const cashClosureSchema = z.object({
  id: z.number(),
  fecha: z.string(),
  observacion: z.string().nullable(),
  total: moneySchema,
  resumen: z.array(z.unknown()),
  usuario_id: z.number(),
})

export const tariffFormSchema = z.object({
  anio_escolar_id: z
    .string()
    .min(1, texts.payments.fees.validation.yearRequired),
  grado_id: z.string().min(1, texts.payments.fees.validation.gradeRequired),
  monto_matricula: moneyInputSchema(0),
  monto_pension: moneyInputSchema(0),
  numero_cuotas: z.string().regex(/^(?:[1-9]|1[0-2])$/, {
    message: texts.payments.fees.validation.numberOfInstallments,
  }),
  dia_vencimiento: z.string().regex(/^(?:[1-9]|1\d|2[0-8])$/, {
    message: texts.payments.fees.validation.dueDay,
  }),
  mes_primera_pension: z.string().regex(/^(?:[1-9]|1[0-2])$/, {
    message: texts.payments.fees.validation.firstPensionMonth,
  }),
})

export const discountFormSchema = z
  .object({
    tipo: z.enum(['beca', 'descuento', 'exoneracion'], {
      error: texts.payments.fees.validation.discountType,
    }),
    modo: z.enum(['monto', 'porcentaje'], {
      error: texts.payments.fees.validation.discountMode,
    }),
    valor: z
      .string()
      .trim()
      .min(1, texts.payments.fees.validation.discountValue),
    motivo: z
      .string()
      .trim()
      .min(1, texts.payments.fees.validation.discountReason),
  })
  .superRefine((values, context) => {
    if (values.modo === 'monto') {
      if (moneyToCents(values.valor) === undefined) {
        context.addIssue({
          code: 'custom',
          path: ['valor'],
          message: texts.payments.fees.validation.moneyDecimals,
        })
      } else if ((moneyToCents(values.valor) ?? 0) <= 0) {
        context.addIssue({
          code: 'custom',
          path: ['valor'],
          message: texts.payments.fees.validation.discountValue,
        })
      } else if ((moneyToCents(values.valor) ?? 0) > 9_999_999_999) {
        context.addIssue({
          code: 'custom',
          path: ['valor'],
          message: texts.payments.fees.validation.moneyMaximum,
        })
      }
    } else {
      const percentage = Number(values.valor)
      if (!Number.isFinite(percentage) || percentage < 1 || percentage > 100) {
        context.addIssue({
          code: 'custom',
          path: ['valor'],
          message: texts.payments.fees.validation.discountPercentage,
        })
      }
    }
  })

export const cancelDiscountSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, texts.payments.fees.validation.cancellationReason),
})

export const cashClosureFormSchema = z
  .object({
    fecha: z
      .string()
      .min(1, texts.payments.fees.validation.dateRequired)
      .regex(/^\d{4}-\d{2}-\d{2}$/, {
        message: texts.payments.fees.validation.dateRequired,
      }),
    observacion: z.string().trim().max(1000),
  })
  .refine((values) => values.fecha <= todayInPeru(), {
    path: ['fecha'],
    message: texts.payments.fees.validation.dateFuture,
  })

export type AcademicYear = z.infer<typeof academicYearSchema>
export type AcademicLevel = z.infer<typeof academicLevelSchema>
export type Grade = z.infer<typeof gradeSchema>
export type Tariff = z.infer<typeof tariffSchema>
export type Discount = z.infer<typeof discountSchema>
export type CashSummary = z.infer<typeof cashSummarySchema>
export type CashClosure = z.infer<typeof cashClosureSchema>
export type TariffFormValues = z.infer<typeof tariffFormSchema>
export type DiscountFormValues = z.infer<typeof discountFormSchema>
export type CashClosureFormValues = z.infer<typeof cashClosureFormSchema>
