import { describe, expect, it } from 'vitest'
import { visibleNavigation } from './navigation'

const ids = (roles: string[], permissions?: string[]) =>
  visibleNavigation(roles, permissions).map((item) => item.id)

describe('visibleNavigation', () => {
  it('muestra Alumnos a los roles que pueden consultarlos', () => {
    for (const role of ['director', 'administrador', 'tesoreria']) {
      expect(ids([role])).toEqual([
        'dashboard',
        'students',
        'payments',
        'debts',
        'reports',
        'tariffs',
        ...(role === 'administrador' ? [] : ['cashbox']),
      ])
    }
    expect(ids(['coordinacion'])).toEqual([
      'dashboard',
      'students',
      'debts',
      'reports',
    ])
    for (const role of ['docente', 'auxiliar']) {
      expect(ids([role])).toEqual(['dashboard', 'students'])
    }
  })

  it('oculta Alumnos a roles sin acceso', () => {
    expect(ids(['apoderado'])).toEqual(['dashboard'])
    expect(ids(['superadministrador'])).toEqual(['dashboard'])
    expect(ids([])).toEqual(['dashboard'])
  })

  it('muestra Pagos a los roles permitidos mientras no hay permisos en la sesión', () => {
    expect(ids(['director'])).toEqual([
      'dashboard',
      'students',
      'payments',
      'debts',
      'reports',
      'tariffs',
      'cashbox',
    ])
    expect(ids(['tesoreria'])).toEqual([
      'dashboard',
      'students',
      'payments',
      'debts',
      'reports',
      'tariffs',
      'cashbox',
    ])
    expect(ids(['coordinacion'])).toEqual([
      'dashboard',
      'students',
      'debts',
      'reports',
    ])
    expect(ids(['docente'])).toEqual(['dashboard', 'students'])
    expect(ids(['auxiliar'])).toEqual(['dashboard', 'students'])
    expect(ids(['apoderado'])).toEqual(['dashboard'])
  })

  it('prioriza los permisos recibidos en la sesión', () => {
    expect(ids(['director'], [])).toEqual(['dashboard', 'students'])
    expect(ids(['apoderado'], ['pagos.ver'])).toEqual(['dashboard', 'payments'])
    expect(ids(['director'], ['tarifas.ver'])).toEqual([
      'dashboard',
      'students',
      'tariffs',
    ])
    expect(ids(['docente'], ['deudas.ver', 'reportes.ver'])).toEqual([
      'dashboard',
      'students',
      'debts',
      'reports',
    ])
  })

  it('limita caja a Director y Tesorería, y tarifas a sus roles de lectura', () => {
    expect(ids(['administrador'])).not.toContain('cashbox')
    expect(ids(['administrador'])).toContain('tariffs')
    expect(ids(['docente'])).not.toContain('tariffs')
    expect(ids(['apoderado'])).not.toContain('cashbox')
  })
})
