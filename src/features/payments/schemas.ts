import { z } from 'zod'
import { texts } from '../../shared/texts'
import { moneyToCents, normalizeMoney } from './money'

const moneySchema = z
  .union([z.number(), z.string()])
  .transform((value) => normalizeMoney(value))

const nullableTextSchema = z.string().nullable()

export function todayInPeru(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((value) => value.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

const personNameSchema = z.object({
  id: z.number().optional(),
  nombre: z.string().optional(),
  apellido: z.string().optional(),
})

export const applicationSchema = z.object({
  id: z.number().optional(),
  cuota_id: z.number(),
  monto_aplicado: moneySchema,
  cuota: z
    .object({
      numero: z.number().optional(),
      descripcion: z.string().optional(),
    })
    .optional(),
})

export const paymentSchema = z.object({
  id: z.number(),
  matricula_id: z.number(),
  alumno_id: z.number(),
  usuario_id: z.number(),
  fecha_pago: z.string(),
  monto: moneySchema,
  medio: z.string(),
  numero_operacion: nullableTextSchema,
  observacion: nullableTextSchema,
  estado: z.enum(['vigente', 'anulado']),
  constancia: z.string(),
  anulada_en: nullableTextSchema,
  motivo_anulacion: nullableTextSchema,
  voucher_disponible: z.boolean(),
  aplicaciones: z.array(applicationSchema).optional(),
})

export const paymentUserSchema = z.object({
  id: z.number().optional(),
  nombre: z.string(),
  apellido: z.string(),
})

export const studentSearchItemSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  apellido: z.string(),
})

export const enrollmentSchema = z.object({
  id: z.number(),
  alumno_id: z.number().nullable().optional(),
  anio_escolar_id: z.number().nullable().optional(),
  fecha_matricula: z.string().nullable().optional(),
  estado: z.string().nullable().optional(),
  anio_escolar: z
    .union([z.string(), z.object({ nombre: z.string() })])
    .nullable()
    .optional(),
  grado: z
    .union([z.string(), z.object({ nombre: z.string() })])
    .nullable()
    .optional(),
  seccion: z
    .union([z.string(), z.object({ nombre: z.string() })])
    .nullable()
    .optional(),
  alumno: personNameSchema.nullable().optional(),
})

export const quotaSchema = z.object({
  id: z.number(),
  matricula_id: z.number(),
  alumno_id: z.number(),
  concepto: z.enum(['matricula', 'pension']),
  numero: z.number(),
  descripcion: z.string(),
  monto_original: moneySchema,
  vencimiento: z.string(),
  anulada_en: nullableTextSchema,
  saldo: moneySchema,
  total_descuentos: moneySchema,
  total_pagos: moneySchema,
  estado: z.enum(['pendiente', 'parcial', 'pagada', 'vencida', 'anulada']),
  alumno: personNameSchema.optional(),
})

export const registrationResultSchema = z.object({
  pago: paymentSchema,
  saldos: z.array(
    z.object({
      cuota_id: z.number(),
      saldo: moneySchema,
      estado: z.string(),
    }),
  ),
  constancia: z.object({ numero: z.string(), url: z.string() }),
})

export const cancellationResultSchema = z.object({
  pago: paymentSchema,
  saldos: z.array(
    z.object({
      cuota_id: z.number(),
      saldo: moneySchema,
      estado: z.string(),
    }),
  ),
})

export const studentAccountSchema = z.object({
  alumno: z.object({
    id: z.number(),
    nombre: z.string(),
    apellido: z.string(),
  }),
  cuotas: z.array(quotaSchema),
  pagos: z.array(paymentSchema),
  totales: z.object({
    emitido: moneySchema,
    pagado: moneySchema,
    saldo: moneySchema,
    vencido: moneySchema,
  }),
})

const amountInputSchema = z
  .string()
  .trim()
  .min(1, texts.payments.validation.amountRequired)
  .refine((value) => moneyToCents(value) !== undefined, {
    message: texts.payments.validation.amountDecimals,
  })
  .refine((value) => (moneyToCents(value) ?? 0) > 0, {
    message: texts.payments.validation.amountPositive,
  })
  .refine((value) => value.length <= 11, {
    message: texts.payments.validation.amountMaximum,
  })

export const paymentFormSchema = z
  .object({
    fecha_pago: z.string().min(1, texts.payments.validation.dateRequired),
    monto: amountInputSchema,
    medio: z.enum(
      ['efectivo', 'deposito', 'transferencia', 'billetera_digital'],
      { error: texts.payments.validation.methodRequired },
    ),
    numero_operacion: z.string().trim().max(100),
    observacion: z.string().trim().max(1000),
    modo_aplicacion: z.enum(['automatica', 'manual']),
    aplicaciones: z.array(
      z.object({
        cuota_id: z.number(),
        monto: amountInputSchema.or(z.literal('')),
      }),
    ),
  })
  .superRefine((values, context) => {
    if (values.fecha_pago > todayInPeru()) {
      context.addIssue({
        code: 'custom',
        path: ['fecha_pago'],
        message: texts.payments.validation.dateFuture,
      })
    }

    if (
      ['deposito', 'transferencia'].includes(values.medio) &&
      !values.numero_operacion
    ) {
      context.addIssue({
        code: 'custom',
        path: ['numero_operacion'],
        message: texts.payments.validation.operationRequired,
      })
    }

    if (values.modo_aplicacion === 'manual') {
      const entries = values.aplicaciones.filter(
        (application) => application.monto !== '',
      )
      const paymentCents = moneyToCents(values.monto)
      const applicationCents = entries.map((entry) => moneyToCents(entry.monto))
      if (
        entries.length === 0 ||
        paymentCents === undefined ||
        applicationCents.some((value) => value === undefined) ||
        applicationCents.reduce<number>(
          (sum, value) => sum + (value ?? 0),
          0,
        ) !== paymentCents
      ) {
        context.addIssue({
          code: 'custom',
          path: ['aplicaciones'],
          message: texts.payments.validation.applicationsSum,
        })
      }
    }
  })

export const cancellationSchema = z.object({
  motivo: z
    .string()
    .trim()
    .min(1, texts.payments.validation.cancellationReason)
    .max(1000, texts.payments.validation.cancellationReasonMaximum),
})

export type Payment = z.infer<typeof paymentSchema>
export type PaymentUser = z.infer<typeof paymentUserSchema>
export type StudentSearchItem = z.infer<typeof studentSearchItemSchema>
export type Enrollment = z.infer<typeof enrollmentSchema>
export type Quota = z.infer<typeof quotaSchema>
export type RegistrationResult = z.infer<typeof registrationResultSchema>
export type CancellationValues = z.infer<typeof cancellationSchema>
export type PaymentFormValues = z.infer<typeof paymentFormSchema>
export type StudentAccount = z.infer<typeof studentAccountSchema>
