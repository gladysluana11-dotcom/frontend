import { describe, expect, it } from 'vitest'
import { resolveSchoolSubdomain } from './subdomain'

describe('resolución del subdominio', () => {
  it('prioriza el subdominio configurado durante el desarrollo', () => {
    expect(
      resolveSchoolSubdomain('localhost', ' salesianinnova '),
    ).toBe('salesianinnova')
  })

  it('prioriza el subdominio configurado también en producción', () => {
    expect(
      resolveSchoolSubdomain(
        'salesianinnova.sge.example.pe',
        'salesian-innova',
      ),
    ).toBe('salesian-innova')
  })

  it('usa la primera etiqueta del hostname cuando no hay configuración', () => {
    expect(
      resolveSchoolSubdomain(
        'salesianinnova.sge.example.pe',
        undefined,
      ),
    ).toBe('salesianinnova')
  })

  it('no trata localhost como un subdominio de colegio en producción', () => {
    expect(resolveSchoolSubdomain('localhost', undefined)).toBe('')
  })
})
