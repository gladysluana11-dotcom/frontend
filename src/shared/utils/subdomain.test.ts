import { describe, expect, it } from 'vitest'
import { resolveSchoolSubdomain } from './subdomain'

describe('resolución del subdominio', () => {
  it('usa la configuración local durante el desarrollo', () => {
    expect(
      resolveSchoolSubdomain('localhost', 'development', ' salesianinnova '),
    ).toBe('salesianinnova')
  })

  it('toma la primera etiqueta del hostname en producción', () => {
    expect(
      resolveSchoolSubdomain(
        'salesianinnova.sge.example.pe',
        'production',
        'ignorado',
      ),
    ).toBe('salesianinnova')
  })

  it('no trata localhost como un subdominio de colegio en producción', () => {
    expect(resolveSchoolSubdomain('localhost', 'production', undefined)).toBe(
      '',
    )
  })
})
