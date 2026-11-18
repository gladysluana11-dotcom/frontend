import { z } from 'zod'
import { api, executeApi } from '../../../shared/api/client'
import {
  parseCollection,
  parseData,
  parseResource,
  type Page,
} from '../../../shared/api/collections'
import { amountWithTwoDecimals } from '../../payments/money'
import { quotaSchema, type Quota } from '../../payments/schemas'
import {
  academicLevelSchema,
  academicYearSchema,
  cashClosureSchema,
  cashSummarySchema,
  cancelDiscountSchema,
  discountFormSchema,
  discountSchema,
  gradeSchema,
  tariffSchema,
  type AcademicLevel,
  type AcademicYear,
  type CashClosure,
  type CashSummary,
  type Discount,
  type DiscountFormValues,
  type Grade,
  type Tariff,
  type TariffFormValues,
} from '../schemas'

export type TariffListParams = {
  page: number
  perPage: number
  search?: string
  academicYearId?: number
  gradeId?: number
}

export type SaveDiscountInput = DiscountFormValues

function serializeMoneyFields(
  body: Record<string, unknown>,
  fields: readonly string[],
): string {
  const amounts = fields.map((field) => body[field])
  let index = 0
  return JSON.stringify(body).replace(
    new RegExp(`("(?:${fields.join('|')})":)\\d+(?:\\.\\d+)?`, 'g'),
    (match) => {
      const value = amounts[index]
      index += 1
      return `${match.slice(0, match.indexOf(':') + 1)}${Number(value).toFixed(2)}`
    },
  )
}

export async function listTariffs(
  params: TariffListParams,
): Promise<Page<Tariff>> {
  const body = await executeApi(() =>
    api.GET('/v1/tarifas', {
      params: {
        query: {
          page: params.page,
          per_page: params.perPage,
          ...(params.search ? { buscar: params.search } : {}),
          ...(params.academicYearId
            ? { anio_escolar_id: params.academicYearId }
            : {}),
          ...(params.gradeId ? { grado_id: params.gradeId } : {}),
          sort: 'grado_id',
          direction: 'asc',
        },
      },
    }),
  )
  return parseCollection(body, 'tarifas', tariffSchema)
}

export async function listAcademicYears(): Promise<Page<AcademicYear>> {
  const body = await executeApi(() =>
    api.GET('/v1/anios-escolares', {
      params: { query: { page: 1, per_page: 100 } },
    }),
  )
  return parseCollection(body, 'anios_escolares', academicYearSchema)
}

export async function listAcademicLevels(): Promise<Page<AcademicLevel>> {
  const body = await executeApi(() =>
    api.GET('/v1/niveles', {
      params: { query: { page: 1, per_page: 100 } },
    }),
  )
  return parseCollection(body, 'niveles', academicLevelSchema)
}

export async function listGrades(): Promise<Page<Grade>> {
  const body = await executeApi(() =>
    api.GET('/v1/grados', {
      params: { query: { page: 1, per_page: 100 } },
    }),
  )
  return parseCollection(body, 'grados', gradeSchema)
}

function parseTariffForm(values: TariffFormValues) {
  return {
    anio_escolar_id: Number(values.anio_escolar_id),
    grado_id: Number(values.grado_id),
    monto_matricula: amountWithTwoDecimals(values.monto_matricula),
    monto_pension: amountWithTwoDecimals(values.monto_pension),
    numero_cuotas: Number(values.numero_cuotas),
    dia_vencimiento: Number(values.dia_vencimiento),
    mes_primera_pension: Number(values.mes_primera_pension),
  }
}

export async function createTariff(values: TariffFormValues): Promise<Tariff> {
  const request = parseTariffForm(values)
  const body = await executeApi(() =>
    api.POST('/v1/tarifas', {
      body: request,
      bodySerializer: (data) =>
        serializeMoneyFields(data, ['monto_matricula', 'monto_pension']),
    }),
  )
  return parseResource(body, 'tarifa', tariffSchema)
}

export async function updateTariff(
  id: number,
  values: TariffFormValues,
): Promise<Tariff> {
  const request = parseTariffForm(values)
  const body = await executeApi(() =>
    api.PUT('/v1/tarifas/{tarifa}', {
      params: { path: { tarifa: id } },
      body: request,
      bodySerializer: (data) =>
        serializeMoneyFields(data, ['monto_matricula', 'monto_pension']),
    }),
  )
  return parseResource(body, 'tarifa', tariffSchema)
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

export async function generateEnrollmentQuotas(
  enrollmentId: number,
  idempotencyKey: string,
): Promise<Quota[]> {
  const body = await executeApi(() =>
    api.POST('/v1/matriculas/{matricula}/generar-cuotas', {
      params: { path: { matricula: enrollmentId } },
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  )
  return parseData(body, z.object({ cuotas: z.array(quotaSchema) })).cuotas
}

function toDiscountRequest(values: DiscountFormValues) {
  const validated = discountFormSchema.parse(values)
  return {
    tipo: validated.tipo,
    modo: validated.modo,
    valor: Number(validated.valor),
    motivo: validated.motivo,
  }
}

export async function createQuotaDiscount(
  quotaId: number,
  values: SaveDiscountInput,
  idempotencyKey: string,
): Promise<Discount> {
  const request = toDiscountRequest(values)
  const body = await executeApi(() =>
    api.POST('/v1/cuotas/{cuota}/descuentos', {
      params: { path: { cuota: quotaId } },
      body: request,
      headers: { 'Idempotency-Key': idempotencyKey },
      bodySerializer: (data) => serializeMoneyFields(data, ['valor']),
    }),
  )
  return parseResource(body, 'descuento', discountSchema)
}

export async function createEnrollmentDiscounts(
  enrollmentId: number,
  values: SaveDiscountInput,
  idempotencyKey: string,
): Promise<Discount[]> {
  const request = toDiscountRequest(values)
  const body = await executeApi(() =>
    api.POST('/v1/matriculas/{matricula}/descuentos', {
      params: { path: { matricula: enrollmentId } },
      body: request,
      headers: { 'Idempotency-Key': idempotencyKey },
      bodySerializer: (data) => serializeMoneyFields(data, ['valor']),
    }),
  )
  return parseData(body, z.object({ descuentos: z.array(discountSchema) }))
    .descuentos
}

export async function cancelDiscount(
  discountId: number,
  values: { motivo: string },
  idempotencyKey: string,
): Promise<Discount> {
  const request = cancelDiscountSchema.parse(values)
  const body = await executeApi(() =>
    api.POST('/v1/descuentos/{descuento}/anular', {
      params: { path: { descuento: discountId } },
      body: request,
      headers: { 'Idempotency-Key': idempotencyKey },
    }),
  )
  return parseResource(body, 'descuento', discountSchema)
}

export async function getCashSummary(date: string): Promise<CashSummary> {
  const body = await executeApi(() =>
    api.GET('/v1/caja/resumen', { params: { query: { fecha: date } } }),
  )
  return parseData(body, cashSummarySchema)
}

export async function closeCashBox(input: {
  fecha: string
  observacion: string
  idempotencyKey: string
}): Promise<CashClosure> {
  const body = await executeApi(() =>
    api.POST('/v1/caja/cierres', {
      body: { fecha: input.fecha, observacion: input.observacion || null },
      headers: { 'Idempotency-Key': input.idempotencyKey },
    }),
  )
  return parseResource(body, 'cierre', cashClosureSchema)
}
