import { describe, expect, it, vi } from 'vitest'
import { applyServerErrors } from './form-errors'
import { ApiError } from './errors'

describe('applyServerErrors', () => {
  it('muestra los errores del servidor en los campos conocidos', () => {
    const setError = vi.fn()
    const error = new ApiError('Revisa los datos', {
      kind: 'validation',
      status: 422,
      errors: { documento_identidad: ['El documento ya existe.'], otro: ['x'] },
    })

    const applied = applyServerErrors(setError, error, [
      'documento_identidad',
      'nombre',
    ])

    expect(applied).toBe(true)
    expect(setError).toHaveBeenCalledTimes(1)
    expect(setError).toHaveBeenCalledWith('documento_identidad', {
      type: 'server',
      message: 'El documento ya existe.',
    })
  })

  it('no hace nada con errores que no son de la API', () => {
    const setError = vi.fn()
    expect(applyServerErrors(setError, new Error('x'), ['nombre'])).toBe(false)
    expect(setError).not.toHaveBeenCalled()
  })
})
