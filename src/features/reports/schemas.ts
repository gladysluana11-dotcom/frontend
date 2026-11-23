import { z } from 'zod'
import { normalizeMoney } from '../payments/money'
import { emptyArrayAsObject, looseRecord } from '../../shared/api/collections'

const moneySchema = z
  .union([z.number(), z.string()])
  .transform((value) => normalizeMoney(value))

export const reportEnrollmentRowSchema = z.object({
  matricula_id: z.number(),
  alumno_id: z.number(),
  nombre: z.string(),
  apellido: z.string(),
  anio_escolar: z.string().nullable(),
  nivel: z.string().nullable(),
  grado: z.string().nullable(),
  seccion: z.string().nullable(),
  estado: z.string(),
  documentos_pendientes: z.number().int(),
})

export const enrollmentReportSchema = z.object({
  resumen: z.object({
    total_matriculas: z.number().int(),
    pendientes_completar: z.number().int(),
  }),
  filas: z.array(reportEnrollmentRowSchema),
filtros: looseRecord.optional(),})

export const reportPaymentRowSchema = z.object({
  pago_id: z.number(),
  fecha_pago: z.string(),
  alumno: z.string(),
  usuario: z.string(),
  medio: z.string(),
  monto: moneySchema,
  estado: z.string(),
  constancia: z.string().nullable(),
})

export const paymentReportSchema = z.object({
  resumen: z.object({
    cantidad: z.number().int(),
    total_vigente: moneySchema,
  }),
  filas: z.array(reportPaymentRowSchema),
filtros: looseRecord.optional(),})

export const monthlyIncomeRowSchema = z.object({
  mes: z.string(),
  cuotas_emitidas: moneySchema,
  cuotas_cobradas: moneySchema,
})

export const monthlyIncomeReportSchema = z.object({
  resumen: z.object({
    total_emitido: moneySchema,
    total_cobrado: moneySchema,
  }),
  filas: z.array(monthlyIncomeRowSchema),
  filtros: looseRecord.optional(),
})

export const dashboardSchema = z.object({
  resumen: z.object({
    matriculados_por_nivel: z.array(
      z.object({
        nivel_id: z.number(),
        nivel: z.string(),
        matriculados: z.number().int(),
      }),
    ),
    recaudacion_mes: moneySchema,
    deuda_total: moneySchema,
    deuda_vencida: moneySchema,
    porcentaje_morosidad: z.string(),
  }),
  filas: z.array(
    z.object({
      nivel_id: z.number(),
      nivel: z.string(),
      matriculados: z.number().int(),
    }),
  ),
filtros: z.preprocess(emptyArrayAsObject, z.object({ mes: z.string().optional() })),})

export type EnrollmentReport = z.infer<typeof enrollmentReportSchema>
export type EnrollmentReportRow = z.infer<typeof reportEnrollmentRowSchema>
export type PaymentReport = z.infer<typeof paymentReportSchema>
export type PaymentReportRow = z.infer<typeof reportPaymentRowSchema>
export type MonthlyIncomeReport = z.infer<typeof monthlyIncomeReportSchema>
export type MonthlyIncomeRow = z.infer<typeof monthlyIncomeRowSchema>
export type DashboardData = z.infer<typeof dashboardSchema>
