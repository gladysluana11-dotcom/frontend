import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import type { Pagination } from '../api/collections'
import { PER_PAGE_OPTIONS, type SortDirection } from '../hooks/use-table-state'
import { texts } from '../texts'
import { cn } from '../utils/cn'
import { Button } from './button'
import { Select } from './select'
import { StatusState } from './status-state'

export type Column<T> = {
  id: string
  header: string
  cell: (row: T) => ReactNode
  /** Si se indica, el encabezado permite ordenar por este campo de la API. */
  sortKey?: string
  /** Oculta la columna en pantallas pequeñas para que la tabla no se desborde. */
  hideBelow?: 'md' | 'lg'
  className?: string
}

type DataTableProps<T> = {
  caption: string
  columns: Column<T>[]
  rows: T[]
  getRowId: (row: T) => string | number
  isLoading?: boolean
  isFetching?: boolean
  error?: Error | null
  onRetry?: () => void
  pagination?: Pagination | undefined
  onPageChange?: (page: number) => void
  onPerPageChange?: (perPage: number) => void
  sort?: { key: string | undefined; direction: SortDirection }
  onSortChange?: (key: string, direction: SortDirection) => void
  onRowClick?: (row: T) => void
  emptyTitle?: string
  emptyMessage?: string
}

const hideClasses = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' }

export function DataTable<T>({
  caption,
  columns,
  rows,
  getRowId,
  isLoading = false,
  isFetching = false,
  error,
  onRetry,
  pagination,
  onPageChange,
  onPerPageChange,
  sort,
  onSortChange,
  onRowClick,
  emptyTitle,
  emptyMessage,
}: DataTableProps<T>) {
  if (isLoading) return <StatusState state="loading" />

  if (error) {
    return (
      <StatusState
        state="error"
        message={error.message}
        {...(onRetry ? { onRetry } : {})}
      />
    )
  }

  if (rows.length === 0) {
    return (
      <StatusState
        state="empty"
        title={emptyTitle ?? texts.table.noResults}
        message={emptyMessage ?? texts.states.noInformation}
      />
    )
  }

  const from = pagination ? (pagination.page - 1) * pagination.perPage + 1 : 1
  const to = pagination ? from + rows.length - 1 : rows.length

  return (
    <div className="space-y-3">
      <div
        className="overflow-x-auto rounded-xl border bg-white"
        aria-busy={isFetching}
      >
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              {columns.map((column) => {
                const sorted = sort?.key === column.sortKey
                const ariaSort =
                  column.sortKey && sorted
                    ? sort?.direction === 'asc'
                      ? 'ascending'
                      : 'descending'
                    : column.sortKey
                      ? 'none'
                      : undefined
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={ariaSort}
                    className={cn(
                      'px-4 py-3 font-semibold',
                      column.hideBelow && hideClasses[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.sortKey && onSortChange ? (
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 uppercase hover:text-foreground"
                        aria-label={texts.table.sortBy(column.header)}
                        onClick={() =>
                          onSortChange(
                            column.sortKey as string,
                            sorted && sort?.direction === 'asc'
                              ? 'desc'
                              : 'asc',
                          )
                        }
                      >
                        {column.header}
                        {sorted ? (
                          sort?.direction === 'asc' ? (
                            <ArrowUp aria-hidden="true" className="size-3" />
                          ) : (
                            <ArrowDown aria-hidden="true" className="size-3" />
                          )
                        ) : (
                          <ChevronsUpDown
                            aria-hidden="true"
                            className="size-3"
                          />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rows.map((row) => (
              <tr
                key={getRowId(row)}
                className={cn(
                  'hover:bg-muted/40',
                  onRowClick ? 'cursor-pointer' : undefined,
                )}
                {...(onRowClick ? { onClick: () => onRowClick(row) } : {})}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn(
                      'px-4 py-3 align-middle',
                      column.hideBelow && hideClasses[column.hideBelow],
                      column.className,
                    )}
                  >
                    {column.cell(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pagination ? (
        <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground" aria-live="polite">
            {texts.table.showing(from, to, pagination.total)}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            {onPerPageChange ? (
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">
                  {texts.table.perPage}
                </span>
                <Select
                  className="h-9 w-20"
                  value={pagination.perPage}
                  onChange={(event) =>
                    onPerPageChange(Number(event.target.value))
                  }
                >
                  {PER_PAGE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </Select>
              </label>
            ) : null}
            <span>
              {texts.table.page(pagination.page, pagination.lastPage)}
            </span>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page <= 1}
                onClick={() => onPageChange?.(pagination.page - 1)}
              >
                {texts.table.previous}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pagination.page >= pagination.lastPage}
                onClick={() => onPageChange?.(pagination.page + 1)}
              >
                {texts.table.next}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
