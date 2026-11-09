import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { DataTable, type Column } from './data-table'

type Row = { id: number; name: string; status: string }

const rows: Row[] = [
  { id: 1, name: 'Ana', status: 'activo' },
  { id: 2, name: 'Luis', status: 'retirado' },
]

const columns: Column<Row>[] = [
  { id: 'name', header: 'Nombre', sortKey: 'nombre', cell: (row) => row.name },
  {
    id: 'status',
    header: 'Estado',
    hideBelow: 'md',
    cell: (row) => row.status,
  },
]

const pagination = { page: 2, perPage: 25, total: 60, lastPage: 3 }

function renderTable(
  props: Partial<Parameters<typeof DataTable<Row>>[0]> = {},
) {
  return render(
    <DataTable
      caption="Alumnos"
      columns={columns}
      rows={rows}
      getRowId={(row) => row.id}
      {...props}
    />,
  )
}

describe('DataTable', () => {
  it('muestra encabezados, filas y la posición dentro del total', () => {
    renderTable({ pagination })

    expect(
      screen.getByRole('columnheader', { name: /nombre/i }),
    ).toBeInTheDocument()
    expect(screen.getByText('Ana')).toBeInTheDocument()
    expect(screen.getByText('Luis')).toBeInTheDocument()
    expect(screen.getByText('Mostrando 26–27 de 60')).toBeInTheDocument()
    expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
  })

  it('muestra el estado de carga', () => {
    renderTable({ isLoading: true, rows: [] })
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('muestra el error con un botón para reintentar', async () => {
    const onRetry = vi.fn()
    renderTable({ error: new Error('No se pudo cargar'), onRetry, rows: [] })

    expect(screen.getByRole('alert')).toHaveTextContent('No se pudo cargar')
    await userEvent.click(
      screen.getByRole('button', { name: /intentar nuevamente/i }),
    )
    expect(onRetry).toHaveBeenCalledOnce()
  })

  it('muestra el estado vacío', () => {
    renderTable({
      rows: [],
      emptyTitle: 'Sin alumnos',
      emptyMessage: 'Todavía no hay datos',
    })
    expect(screen.getByText('Sin alumnos')).toBeInTheDocument()
    expect(screen.getByText('Todavía no hay datos')).toBeInTheDocument()
  })

  it('cambia de página y de filas por página', async () => {
    const onPageChange = vi.fn()
    const onPerPageChange = vi.fn()
    renderTable({ pagination, onPageChange, onPerPageChange })

    await userEvent.click(screen.getByRole('button', { name: 'Siguiente' }))
    expect(onPageChange).toHaveBeenCalledWith(3)

    await userEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(onPageChange).toHaveBeenCalledWith(1)

    await userEvent.selectOptions(screen.getByRole('combobox'), '50')
    expect(onPerPageChange).toHaveBeenCalledWith(50)
  })

  it('desactiva Anterior en la primera página y Siguiente en la última', () => {
    const { rerender } = renderTable({ pagination: { ...pagination, page: 1 } })
    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDisabled()

    rerender(
      <DataTable
        caption="Alumnos"
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        pagination={{ ...pagination, page: 3 }}
      />,
    )
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDisabled()
  })

  it('permite ordenar y avisa la dirección', async () => {
    const onSortChange = vi.fn()
    renderTable({ sort: { key: 'nombre', direction: 'asc' }, onSortChange })

    const header = screen.getByRole('columnheader', { name: /nombre/i })
    expect(header).toHaveAttribute('aria-sort', 'ascending')

    await userEvent.click(within(header).getByRole('button'))
    expect(onSortChange).toHaveBeenCalledWith('nombre', 'desc')
  })

  it('avisa qué fila se eligió', async () => {
    const onRowClick = vi.fn()
    renderTable({ onRowClick })

    await userEvent.click(screen.getByText('Luis'))
    expect(onRowClick).toHaveBeenCalledWith(rows[1])
  })

  it('oculta en pantallas pequeñas las columnas secundarias', () => {
    renderTable()
    expect(
      screen.getByRole('columnheader', { name: 'Estado' }).className,
    ).toContain('hidden')
  })
})
