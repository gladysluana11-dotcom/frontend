import type { DebtParams } from './api/debts-api'
import type { TableState } from '../../shared/hooks/use-table-state'

const DEBT_SORT_KEYS = [
  'nombre',
  'total_vencido',
  'total_pendiente',
  'dias_atraso',
  'cuotas_vencidas',
] as const

function positiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export function debtParamsFromState(
  state: TableState,
  search: string,
): DebtParams {
  const sort = DEBT_SORT_KEYS.find((key) => key === state.sort)
  const nivelId = positiveInteger(state.filters.nivel_id)
  const gradoId = positiveInteger(state.filters.grado_id)
  const seccionId = positiveInteger(state.filters.seccion_id)
  const anioEscolarId = positiveInteger(state.filters.anio_escolar_id)
  const diasAtrasoMin = positiveInteger(state.filters.dias_atraso_min)
  const minimumAmount = state.filters.monto_min
    ? Number(state.filters.monto_min)
    : undefined
  return {
    page: state.page,
    perPage: state.perPage,
    ...(nivelId ? { nivelId } : {}),
    ...(gradoId ? { gradoId } : {}),
    ...(seccionId ? { seccionId } : {}),
    ...(anioEscolarId ? { anioEscolarId } : {}),
    ...(diasAtrasoMin ? { diasAtrasoMin } : {}),
    ...(minimumAmount !== undefined && Number.isFinite(minimumAmount)
      ? { montoMin: minimumAmount }
      : {}),
    ...(search ? { buscar: search } : {}),
    ...(sort ? { orden: sort, direccion: state.direction } : {}),
  }
}
