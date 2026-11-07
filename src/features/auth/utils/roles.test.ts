import { describe, expect, it } from 'vitest'
import {
  extractRoleNames,
  extractRoles,
  normalizeRole,
  primaryRoleLabel,
  roleLabel,
} from './roles'

describe('roles', () => {
  it('normaliza tildes, mayúsculas y separadores', () => {
    expect(normalizeRole('Tesorería')).toBe('tesoreria')
    expect(normalizeRole('SUPER_ADMINISTRADOR')).toBe('superadministrador')
    expect(normalizeRole('Coordinación')).toBe('coordinacion')
  })

  it('acepta una lista de textos', () => {
    expect(extractRoles({ roles: ['Director', 'Docente'] })).toEqual([
      'director',
      'docente',
    ])
  })

  it('acepta una lista de objetos con nombre', () => {
    expect(
      extractRoleNames({
        roles: [{ name: 'tesoreria' }, { nombre: 'Auxiliar' }],
      }),
    ).toEqual(['tesoreria', 'Auxiliar'])
  })

  it('acepta un mapa cuyas claves son los roles', () => {
    expect(
      extractRoles({ roles: { director: { relations: ['roles'] } } }),
    ).toEqual(['director'])
  })

  it('devuelve vacío cuando no hay roles', () => {
    expect(extractRoles({ roles: {} })).toEqual([])
    expect(extractRoles(null)).toEqual([])
  })

  it('muestra etiquetas legibles', () => {
    expect(roleLabel('tesoreria')).toBe('Tesorería')
    expect(roleLabel('rol_nuevo')).toBe('rol nuevo')
    expect(primaryRoleLabel({ roles: ['coordinacion'] }, 'Usuario')).toBe(
      'Coordinación',
    )
    expect(primaryRoleLabel({ roles: [] }, 'Usuario')).toBe('Usuario')
  })
})
