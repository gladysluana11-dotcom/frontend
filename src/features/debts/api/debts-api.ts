import { api, executeApi } from '../../../shared/api/client'
import {
  parseCollection,
  parseData,
  parseResource,
  type Page,
} from '../../../shared/api/collections'
import type { SortDirection } from '../../../shared/hooks/use-table-state'
import { downloadBlob } from '../../../shared/utils/download'
import {
  collectionSchema,
  debtAlertsSchema,
  debtByClassSchema,
  debtPageSchema,
  type Collection,
  type CollectionFormValues,
  type Debt,
  type DebtAlerts,
  type DebtSection,
} from '../schemas'
import { amountWithTwoDecimals } from '../../payments/money'

export type DebtParams = {
  page: number
  perPage: number
  nivelId?: number
  gradoId?: number
  seccionId?: number
  anioEscolarId?: number
  diasAtrasoMin?: number
  montoMin?: number
  buscar?: string
  orden?:
    | 'nombre'
    | 'total_vencido'
    | 'total_pendiente'
    | 'dias_atraso'
    | 'cuotas_vencidas'
  direccion?: SortDirection
}

export type DebtPage = Page<Debt>
type ExportFormat = 'pdf' | 'xlsx'

function debtQuery(params: DebtParams) {
  return {
    page: params.page,
    per_page: params.perPage,
    ...(params.nivelId ? { nivel_id: params.nivelId } : {}),
    ...(params.gradoId ? { grado_id: params.gradoId } : {}),
    ...(params.seccionId ? { seccion_id: params.seccionId } : {}),
    ...(params.anioEscolarId ? { anio_escolar_id: params.anioEscolarId } : {}),
    ...(params.diasAtrasoMin ? { dias_atraso_min: params.diasAtrasoMin } : {}),
    ...(params.montoMin !== undefined ? { monto_min: params.montoMin } : {}),
    ...(params.buscar ? { buscar: params.buscar } : {}),
    ...(params.orden ? { orden: params.orden } : {}),
    ...(params.direccion ? { direccion: params.direccion } : {}),
  }
}

export async function listDebts(params: DebtParams): Promise<DebtPage> {
  const body = await executeApi(() =>
    api.GET('/v1/deudas', { params: { query: debtQuery(params) } }),
  )
  const data = parseData(body, debtPageSchema)
  return {
    items: data.deudas,
    pagination: {
      page: data.paginacion.pagina,
      perPage: data.paginacion.por_pagina,
      total: data.paginacion.total,
      lastPage: Math.max(data.paginacion.ultima_pagina, 1),
    },
  }
}

export async function listDebtsByClass(
  params: DebtParams,
): Promise<DebtSection[]> {
  const body = await executeApi(() =>
    api.GET('/v1/deudas/por-aula', {
      params: { query: { ...debtQuery(params), formato: 'json' } },
    }),
  )
  return parseData(body, debtByClassSchema).secciones
}

export async function downloadDebtsByClass(
  params: DebtParams,
  formato: ExportFormat,
): Promise<void> {
  const blob = (await executeApi(() =>
    api.GET('/v1/deudas/por-aula', {
      params: { query: { ...debtQuery(params), formato } },
      parseAs: 'blob',
    }),
  )) as Blob
  downloadBlob(blob, `deuda-por-aula.${formato === 'xlsx' ? 'xlsx' : 'pdf'}`)
}

export async function listCollectionHistory(
  studentId: number,
  page = 1,
  perPage = 25,
): Promise<Page<Collection>> {
  const body = await executeApi(() =>
    api.GET('/v1/alumnos/{alumno}/gestiones-cobranza', {
      params: {
        path: { alumno: studentId },
        query: { page, per_page: perPage },
      },
    }),
  )
  return parseCollection(body, 'gestiones', collectionSchema)
}

export async function createCollection(
  studentId: number,
  values: CollectionFormValues,
): Promise<Collection> {
  const compromisoMonto = values.compromiso_monto
    ? amountWithTwoDecimals(values.compromiso_monto).toFixed(2)
    : null
  const body = {
    fecha: values.fecha,
    medio_contacto: values.medio_contacto,
    resultado: values.resultado.trim(),
    compromiso_pago_fecha: values.compromiso_pago_fecha || null,
    compromiso_monto: compromisoMonto === null ? null : Number(compromisoMonto),
    observacion: values.observacion?.trim() || null,
  }
  const response = await executeApi(() =>
    api.POST('/v1/alumnos/{alumno}/gestiones-cobranza', {
      params: { path: { alumno: studentId } },
      body,
      bodySerializer: () =>
        JSON.stringify(body).replace(
          /"compromiso_monto":(?:\d+(?:\.\d+)?|null)/,
          `"compromiso_monto":${compromisoMonto ?? 'null'}`,
        ),
    }),
  )
  return parseResource(response, 'gestion', collectionSchema)
}

export async function getDebtAlerts(): Promise<DebtAlerts> {
  const body = await executeApi(() => api.GET('/v1/alertas/cuotas'))
  return parseData(body, debtAlertsSchema)
}
