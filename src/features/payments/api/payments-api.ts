import { z } from 'zod'
import { api, executeApi } from '../../../shared/api/client'
import {
  parseCollection,
  parseData,
  parseResource,
  type Page,
} from '../../../shared/api/collections'
import type { SortDirection } from '../../../shared/hooks/use-table-state'
import { ApiError } from '../../../shared/api/errors'
import { texts } from '../../../shared/texts'
import { downloadBlob } from '../../../shared/utils/download'
import {
  cancellationResultSchema,
  enrollmentSchema,
  paymentSchema,
  paymentUserSchema,
  quotaSchema,
  registrationResultSchema,
  studentAccountSchema,
  studentSearchItemSchema,
  type CancellationValues,
  type Enrollment,
  type Payment,
  type PaymentUser,
  type Quota,
  type RegistrationResult,
  type StudentAccount,
  type StudentSearchItem,
} from '../schemas'
import { amountWithTwoDecimals } from '../money'

export type PaymentListParams = {
  page: number
  perPage: number
  studentId?: number
  desde?: string
  hasta?: string
  medio?: string
  estado?: string
  sort?: string
  direction?: SortDirection
}

export type RegisterPaymentInput = {
  matricula_id: number
  fecha_pago: string
  monto: string
  medio: 'efectivo' | 'deposito' | 'transferencia' | 'billetera_digital'
  numero_operacion: string
  observacion: string
  modo_aplicacion: 'automatica' | 'manual'
  aplicaciones: Array<{ cuota_id: number; monto: string }>
}

function serializePaymentBody(body: {
  monto: number
  aplicaciones?: Array<{ monto: number }> | undefined
}): string {
  const amounts = [
    body.monto,
    ...(body.aplicaciones ?? []).map((application) => application.monto),
  ]
  let index = 0
  return JSON.stringify(body).replace(/"monto":\d+(?:\.\d+)?/g, (match) => {
    const value = amounts[index]
    index += 1
    return `${match.slice(0, match.indexOf(':') + 1)}${value?.toFixed(2) ?? '0.00'}`
  })
}

const paymentSortKeys = [
  'id',
  'fecha_pago',
  'monto',
  'medio',
  'estado',
] as const
const paymentMethods = [
  'efectivo',
  'deposito',
  'transferencia',
  'billetera_digital',
] as const
const paymentStates = ['vigente', 'anulado'] as const

function unexpectedResponse(): ApiError {
  return new ApiError(texts.errors.unexpectedShape, { kind: 'http' })
}

export async function listPayments(
  params: PaymentListParams,
): Promise<Page<Payment>> {
  const sort = paymentSortKeys.find((value) => value === params.sort)
  const medio = paymentMethods.find((value) => value === params.medio)
  const estado = paymentStates.find((value) => value === params.estado)
  const body = await executeApi(() =>
    api.GET('/v1/pagos', {
      params: {
        query: {
          page: params.page,
          per_page: params.perPage,
          ...(params.studentId ? { alumno_id: params.studentId } : {}),
          ...(params.desde ? { desde: params.desde } : {}),
          ...(params.hasta ? { hasta: params.hasta } : {}),
          ...(medio ? { medio } : {}),
          ...(estado ? { estado } : {}),
          ...(sort ? { sort, direction: params.direction ?? 'asc' } : {}),
        },
      },
    }),
  )
  return parseCollection(body, 'pagos', paymentSchema)
}

export async function searchPaymentStudents(
  search: string,
): Promise<Page<StudentSearchItem>> {
  const body = await executeApi(() =>
    api.GET('/v1/alumnos', {
      params: { query: { page: 1, per_page: 10, buscar: search } },
    }),
  )
  return parseCollection(body, 'alumnos', studentSearchItemSchema)
}

export async function listStudentEnrollments(
  studentId: number,
): Promise<Page<Enrollment>> {
  const body = await executeApi(() =>
    api.GET('/v1/matriculas', {
      params: {
        query: { page: 1, per_page: 100, alumno_id: studentId },
      },
    }),
  )
  return parseCollection(body, 'matriculas', enrollmentSchema)
}

export async function getEnrollment(id: number): Promise<Enrollment> {
  const body = await executeApi(() =>
    api.GET('/v1/matriculas/{matricula}', {
      params: { path: { matricula: id } },
    }),
  )
  const data = parseData(
    body,
    z.object({ matricula: z.array(enrollmentSchema) }),
  )
  const enrollment = data.matricula[0]
  if (!enrollment) throw unexpectedResponse()
  return enrollment
}

export async function listEnrollmentQuotas(
  enrollmentId: number,
): Promise<Page<Quota>> {
  const body = await executeApi(() =>
    api.GET('/v1/matriculas/{matricula}/cuotas', {
      params: {
        path: { matricula: enrollmentId },
        query: { page: 1, per_page: 100 },
      },
    }),
  )
  return parseCollection(body, 'cuotas', quotaSchema)
}

export async function registerPayment(
  input: RegisterPaymentInput,
  idempotencyKey: string,
): Promise<RegistrationResult> {
  const body = await executeApi(() =>
    api.POST('/v1/pagos', {
      params: { header: { 'Idempotency-Key': idempotencyKey } },
      body: {
        matricula_id: input.matricula_id,
        fecha_pago: input.fecha_pago,
        monto: amountWithTwoDecimals(input.monto),
        medio: input.medio,
        numero_operacion: input.numero_operacion || null,
        observacion: input.observacion || null,
        ...(input.modo_aplicacion === 'manual'
          ? {
              aplicaciones: input.aplicaciones.map((application) => ({
                cuota_id: application.cuota_id,
                monto: amountWithTwoDecimals(application.monto),
              })),
            }
          : {}),
      },
      bodySerializer: serializePaymentBody,
    }),
  )
  return parseData(body, registrationResultSchema)
}

export async function getPayment(id: number): Promise<Payment> {
  const body = await executeApi(() =>
    api.GET('/v1/pagos/{pago}', { params: { path: { pago: id } } }),
  )
  return parseResource(body, 'pago', paymentSchema)
}

export async function getPaymentUser(id: number): Promise<PaymentUser> {
  const body = await executeApi(() =>
    api.GET('/v1/usuarios/{usuario}', {
      params: { path: { usuario: String(id) } },
    }),
  )
  const data = parseData(
    body,
    z.object({ usuario: z.array(paymentUserSchema) }),
  )
  const user = data.usuario[0]
  if (!user) throw unexpectedResponse()
  return user
}

export async function cancelPayment(
  id: number,
  values: CancellationValues,
): Promise<Payment> {
  const body = await executeApi(() =>
    api.POST('/v1/pagos/{pago}/anular', {
      params: { path: { pago: id } },
      body: values,
    }),
  )
  return parseData(body, cancellationResultSchema).pago
}

export async function uploadPaymentVoucher(
  id: number,
  file: File,
): Promise<Payment> {
  const body = await executeApi(() =>
    api.POST('/v1/pagos/{pago}/voucher', {
      params: { path: { pago: id } },
      body: { voucher: file as unknown as string },
      bodySerializer: () => {
        const data = new FormData()
        data.append('voucher', file)
        return data
      },
    }),
  )
  return parseResource(body, 'pago', paymentSchema)
}

export async function getPaymentVoucher(id: number): Promise<Blob> {
  return (await executeApi(() =>
    api.GET('/v1/pagos/{pago}/voucher', {
      params: { path: { pago: id } },
      parseAs: 'blob',
    }),
  )) as Blob
}

export async function downloadPaymentReceipt(id: number): Promise<void> {
  const blob = (await executeApi(() =>
    api.GET('/v1/pagos/{pago}/constancia', {
      params: { path: { pago: id } },
      parseAs: 'blob',
    }),
  )) as Blob
  downloadBlob(blob, `constancia-pago-${id}.pdf`)
}

export async function getStudentAccount(
  studentId: number,
): Promise<StudentAccount> {
  const body = await executeApi(() =>
    api.GET('/v1/alumnos/{alumno}/estado-cuenta', {
      params: { path: { alumno: studentId } },
    }),
  )
  return parseData(body, studentAccountSchema)
}

export async function downloadStudentAccount(studentId: number): Promise<void> {
  const blob = (await executeApi(() =>
    api.GET('/v1/alumnos/{alumno}/estado-cuenta/pdf', {
      params: { path: { alumno: studentId } },
      parseAs: 'blob',
    }),
  )) as Blob
  downloadBlob(blob, `estado-cuenta-alumno-${studentId}.pdf`)
}
