import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useIdleSession } from './use-idle-session'

describe('useIdleSession', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('avisa a los 25 minutos y cierra a los 30 minutos', () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const { result } = renderHook(() => useIdleSession(true, onTimeout))

    act(() => vi.advanceTimersByTime(25 * 60 * 1000))
    expect(result.current).toBe(true)
    expect(onTimeout).not.toHaveBeenCalled()

    act(() => vi.advanceTimersByTime(5 * 60 * 1000))
    expect(onTimeout).toHaveBeenCalledTimes(1)
  })

  it('reinicia la advertencia y el cierre al detectar actividad', () => {
    vi.useFakeTimers()
    const onTimeout = vi.fn()
    const { result } = renderHook(() => useIdleSession(true, onTimeout))

    act(() => vi.advanceTimersByTime(24 * 60 * 1000))
    act(() => window.dispatchEvent(new Event('keydown')))
    act(() => vi.advanceTimersByTime(24 * 60 * 1000))

    expect(result.current).toBe(false)
    expect(onTimeout).not.toHaveBeenCalled()
  })
})
