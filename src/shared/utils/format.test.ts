import { describe, expect, it } from 'vitest'
import { formatDate, formatSoles } from './format'

describe('formatDate', () => {
  it('no desplaza una fecha sin hora por la zona horaria', () => {
    expect(formatDate('2026-03-02')).toBe('02/03/2026')
    expect(formatDate('2013-06-18')).toBe('18/06/2013')
  })

  it('convierte una fecha con hora a la zona horaria de Lima', () => {
    expect(formatDate('2026-03-02T05:00:00.000000Z')).toBe('02/03/2026')
    expect(formatDate('2026-03-02T03:00:00.000000Z')).toBe('01/03/2026')
  })

  it('avisa cuando la fecha no es válida', () => {
    expect(formatDate('no es fecha')).toBe('Fecha no válida')
  })
})

describe('formatSoles', () => {
  it('da formato de soles', () => {
    expect(formatSoles(1234.5)).toMatch(/S\/\s?1,234\.50/)
  })
})
