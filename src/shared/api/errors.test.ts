import { describe, expect, it } from 'vitest'
import { normalizeApiError } from './errors'

describe('normalización de errores HTTP', () => {
  it('normaliza mensaje, errores por campo y código', () => {
    const error = normalizeApiError(
      {
        message: 'Hay campos inválidos.',
        errors: { email: ['El correo ya está registrado.'] },
        code: 'VALIDATION_ERROR',
      },
      422,
    )

    expect(error.message).toBe('Hay campos inválidos.')
    expect(error.errors.email).toEqual(['El correo ya está registrado.'])
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.kind).toBe('validation')
  })

  it.each([
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [422, 'validation'],
    [429, 'rate_limit'],
  ] as const)('clasifica HTTP %s', (status, kind) => {
    expect(normalizeApiError({}, status).kind).toBe(kind)
  })

  it('identifica fallas de red', () => {
    expect(normalizeApiError(new TypeError('fetch failed')).kind).toBe(
      'network',
    )
  })
})
