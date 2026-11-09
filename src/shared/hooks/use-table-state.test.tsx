import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { useTableState } from './use-table-state'

function setup(initialUrl: string) {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <MemoryRouter initialEntries={[initialUrl]}>{children}</MemoryRouter>
  )
  return renderHook(() => useTableState(['estado', 'grado_id']), { wrapper })
}

describe('useTableState', () => {
  it('lee el estado desde la URL', () => {
    const { result } = setup(
      '/?page=3&per_page=50&buscar=ana&estado=activo&sort=apellido&direction=desc',
    )

    expect(result.current.state).toEqual({
      page: 3,
      perPage: 50,
      search: 'ana',
      sort: 'apellido',
      direction: 'desc',
      filters: { estado: 'activo' },
    })
  })

  it('usa valores por defecto cuando la URL está vacía o es inválida', () => {
    const { result } = setup('/?page=abc&per_page=-4')

    expect(result.current.state.page).toBe(1)
    expect(result.current.state.perPage).toBe(25)
    expect(result.current.state.direction).toBe('asc')
  })

  it('limita las filas por página a 100', () => {
    const { result } = setup('/?per_page=500')
    expect(result.current.state.perPage).toBe(100)
  })

  it('vuelve a la página 1 al cambiar un filtro o la búsqueda', () => {
    const { result } = setup('/?page=4')

    act(() => result.current.setFilter('estado', 'retirado'))
    expect(result.current.state.page).toBe(1)
    expect(result.current.state.filters).toEqual({ estado: 'retirado' })

    act(() => result.current.setPage(3))
    expect(result.current.state.page).toBe(3)

    act(() => result.current.setSearch('  luis '))
    expect(result.current.state.page).toBe(1)
    expect(result.current.state.search).toBe('luis')
  })

  it('cambia varios filtros a la vez y los limpia', () => {
    const { result } = setup('/?grado_id=2&estado=activo&buscar=ana')

    act(() => result.current.setFilters({ grado_id: '5', estado: undefined }))
    expect(result.current.state.filters).toEqual({ grado_id: '5' })

    act(() => result.current.clearFilters())
    expect(result.current.state.filters).toEqual({})
    expect(result.current.state.search).toBe('')
  })
})
