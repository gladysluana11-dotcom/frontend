import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIdempotencyKey } from './use-idempotency-key'

describe('useIdempotencyKey', () => {
  afterEach(() => vi.restoreAllMocks())

  it('conserva la misma clave al reintentar los mismos datos', () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
      .mockReturnValue('00000000-0000-4000-8000-000000000003')
    const { result, rerender } = renderHook(
      ({ data }) => useIdempotencyKey(data),
      { initialProps: { data: '{"monto":"10.00"}' } },
    )
    const first = result.current.key

    act(() => result.current.markFailed('{"monto":"10.00"}'))
    rerender({ data: '{"monto":"10.00"}' })

    expect(result.current.key).toBe(first)
  })

  it('genera una clave nueva si cambian los datos después de un fallo', async () => {
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
      .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
    const { result, rerender } = renderHook(
      ({ data }) => useIdempotencyKey(data),
      { initialProps: { data: '{"monto":"10.00"}' } },
    )
    act(() => result.current.markFailed('{"monto":"10.00"}'))

    rerender({ data: '{"monto":"11.00"}' })
    await waitFor(() =>
      expect(result.current.key).toBe('00000000-0000-4000-8000-000000000002'),
    )
  })

  it('descarta la clave tras el éxito', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '00000000-0000-4000-8000-000000000001',
    )
    const { result } = renderHook(() => useIdempotencyKey('datos'))

    act(() => result.current.markSucceeded())

    expect(result.current.key).toBeUndefined()
  })
})
