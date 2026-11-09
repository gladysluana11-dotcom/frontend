import { describe, expect, it } from 'vitest'
import { visibleNavigation } from './navigation'

const ids = (roles: string[]) => visibleNavigation(roles).map((item) => item.id)

describe('visibleNavigation', () => {
  it('muestra Alumnos a los roles que pueden consultarlos', () => {
    for (const role of [
      'director',
      'administrador',
      'coordinacion',
      'tesoreria',
      'docente',
      'auxiliar',
    ]) {
      expect(ids([role])).toEqual(['dashboard', 'students'])
    }
  })

  it('oculta Alumnos a roles sin acceso', () => {
    expect(ids(['apoderado'])).toEqual(['dashboard'])
    expect(ids(['superadministrador'])).toEqual(['dashboard'])
    expect(ids([])).toEqual(['dashboard'])
  })
})
