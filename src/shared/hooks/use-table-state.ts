import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'

export type SortDirection = 'asc' | 'desc'

export type TableState = {
  page: number
  perPage: number
  search: string
  sort: string | undefined
  direction: SortDirection
  filters: Record<string, string>
}

export const PER_PAGE_OPTIONS = [10, 25, 50, 100] as const
const DEFAULT_PER_PAGE = 25

function positiveInteger(value: string | null, fallback: number): number {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

/**
 * Estado de una tabla guardado en la URL (página, búsqueda, orden y filtros), para que
 * se pueda recargar o compartir el enlace. En la URL solo van ids y filtros, nunca datos de personas.
 * Cualquier cambio distinto de la página vuelve a la página 1.
 */
export function useTableState(filterKeys: readonly string[]) {
  const [params, setParams] = useSearchParams()
  const filterKeyList = filterKeys.join(',')

  const state = useMemo<TableState>(() => {
    const perPage = positiveInteger(params.get('per_page'), DEFAULT_PER_PAGE)
    const filters: Record<string, string> = {}
    for (const key of filterKeyList.split(',').filter(Boolean)) {
      const value = params.get(key)
      if (value) filters[key] = value
    }
    return {
      page: positiveInteger(params.get('page'), 1),
      perPage: Math.min(perPage, 100),
      search: params.get('buscar') ?? '',
      sort: params.get('sort') ?? undefined,
      direction: params.get('direction') === 'desc' ? 'desc' : 'asc',
      filters,
    }
  }, [params, filterKeyList])

  const update = useCallback(
    (changes: Record<string, string | undefined>, keepPage = false) => {
      const next = new URLSearchParams(params)
      for (const [key, value] of Object.entries(changes)) {
        if (value === undefined || value === '') next.delete(key)
        else next.set(key, value)
      }
      if (!keepPage && !('page' in changes)) next.delete('page')
      setParams(next, { replace: true })
    },
    [params, setParams],
  )

  const setPage = useCallback(
    (page: number) =>
      update({ page: page <= 1 ? undefined : String(page) }, true),
    [update],
  )
  const setPerPage = useCallback(
    (perPage: number) =>
      update({
        per_page: perPage === DEFAULT_PER_PAGE ? undefined : String(perPage),
      }),
    [update],
  )
  const setSearch = useCallback(
    (search: string) => update({ buscar: search.trim() || undefined }),
    [update],
  )
  const setSort = useCallback(
    (sort: string | undefined, direction: SortDirection = 'asc') =>
      update({ sort, direction: sort ? direction : undefined }),
    [update],
  )
  const setFilter = useCallback(
    (key: string, value: string | undefined) => update({ [key]: value }),
    [update],
  )
  const setFilters = useCallback(
    (changes: Record<string, string | undefined>) => update(changes),
    [update],
  )
  const clearFilters = useCallback(() => {
    const cleared: Record<string, string | undefined> = { buscar: undefined }
    for (const key of filterKeyList.split(',').filter(Boolean))
      cleared[key] = undefined
    update(cleared)
  }, [filterKeyList, update])

  return {
    state,
    setPage,
    setPerPage,
    setSearch,
    setSort,
    setFilter,
    setFilters,
    clearFilters,
  }
}
