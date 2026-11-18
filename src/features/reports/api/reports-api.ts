import { api, executeApi } from '../../../shared/api/client'
import { parseData } from '../../../shared/api/collections'
import { downloadBlob } from '../../../shared/utils/download'
import {
  dashboardSchema,
  enrollmentReportSchema,
  monthlyIncomeReportSchema,
  paymentReportSchema,
  type DashboardData,
  type EnrollmentReport,
  type MonthlyIncomeReport,
  type PaymentReport,
} from '../schemas'

export type ReportKind = 'matriculas' | 'pagos' | 'ingresos-mensuales'
export type ReportFormat = 'pdf' | 'xlsx'

export type ReportParams = {
  desde?: string
  hasta?: string
  medio?: 'efectivo' | 'deposito' | 'transferencia' | 'billetera_digital'
  usuarioId?: number
  anioEscolarId?: number
  nivelId?: number
  gradoId?: number
  seccionId?: number
  estado?: 'pre_inscrito' | 'pendiente_documentos' | 'matriculado' | 'retirado'
  buscar?: string
}

function reportQuery(params: ReportParams, formato: 'json' | ReportFormat) {
  return {
    formato,
    ...(params.desde ? { desde: params.desde } : {}),
    ...(params.hasta ? { hasta: params.hasta } : {}),
    ...(params.medio ? { medio: params.medio } : {}),
    ...(params.usuarioId ? { usuario_id: params.usuarioId } : {}),
    ...(params.anioEscolarId ? { anio_escolar_id: params.anioEscolarId } : {}),
    ...(params.nivelId ? { nivel_id: params.nivelId } : {}),
    ...(params.gradoId ? { grado_id: params.gradoId } : {}),
    ...(params.seccionId ? { seccion_id: params.seccionId } : {}),
    ...(params.estado ? { estado: params.estado } : {}),
    ...(params.buscar ? { buscar: params.buscar } : {}),
  }
}

export async function getEnrollmentReport(
  params: ReportParams,
): Promise<EnrollmentReport> {
  const body = await executeApi(() =>
    api.GET('/v1/reportes/matriculas', {
      params: { query: reportQuery(params, 'json') },
    }),
  )
  return parseData(body, enrollmentReportSchema)
}

export async function getPaymentReport(
  params: ReportParams,
): Promise<PaymentReport> {
  const body = await executeApi(() =>
    api.GET('/v1/reportes/pagos', {
      params: { query: reportQuery(params, 'json') },
    }),
  )
  return parseData(body, paymentReportSchema)
}

export async function getMonthlyIncomeReport(
  params: ReportParams,
): Promise<MonthlyIncomeReport> {
  const body = await executeApi(() =>
    api.GET('/v1/reportes/ingresos-mensuales', {
      params: { query: reportQuery(params, 'json') },
    }),
  )
  return parseData(body, monthlyIncomeReportSchema)
}

export async function getDirectorDashboard(): Promise<DashboardData> {
  const body = await executeApi(() =>
    api.GET('/v1/reportes/dashboard', {
      params: { query: { formato: 'json' } },
    }),
  )
  return parseData(body, dashboardSchema)
}

export async function downloadReport(
  kind: ReportKind,
  params: ReportParams,
  formato: ReportFormat,
): Promise<void> {
  const query = reportQuery(params, formato)
  const blob = (await executeApi(() => {
    switch (kind) {
      case 'matriculas':
        return api.GET('/v1/reportes/matriculas', {
          params: { query },
          parseAs: 'blob',
        })
      case 'pagos':
        return api.GET('/v1/reportes/pagos', {
          params: { query },
          parseAs: 'blob',
        })
      case 'ingresos-mensuales':
        return api.GET('/v1/reportes/ingresos-mensuales', {
          params: { query },
          parseAs: 'blob',
        })
    }
  })) as Blob
  const filename = {
    matriculas: 'reporte-matriculas',
    pagos: 'reporte-pagos',
    'ingresos-mensuales': 'reporte-ingresos-mensuales',
  }[kind]
  downloadBlob(blob, `${filename}.${formato === 'xlsx' ? 'xlsx' : 'pdf'}`)
}
