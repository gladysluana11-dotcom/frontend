import { describe, expect, it } from 'vitest'
import type { StudentHistory } from '../schemas'
import { buildTimeline } from './timeline'

const history: StudentHistory = {
  matriculas: [],
  cambios_estado: [
    {
      estado_anterior: null,
      estado_nuevo: 'activo',
      motivo: null,
      fecha: '2026-03-02T05:00:00.000000Z',
    },
    {
      estado_anterior: 'activo',
      estado_nuevo: 'retirado',
      motivo: 'Traslado',
      fecha: '2026-08-10T05:00:00.000000Z',
    },
  ],
  cambios_matricula: [
    {
      evento: 'creada',
      estado_anterior: null,
      estado_nuevo: 'matriculado',
      motivo: null,
      fecha: '2026-03-02T06:00:00.000000Z',
    },
  ],
}

describe('buildTimeline', () => {
  it('une los cambios y los ordena del más reciente al más antiguo', () => {
    const items = buildTimeline(history)

    expect(items.map((item) => item.title)).toEqual([
      'Estado del alumno: de Activo a Retirado',
      'Matrícula creada (Matriculado)',
      'Estado del alumno: Activo',
    ])
  })

  it('conserva el motivo cuando existe', () => {
    expect(buildTimeline(history)[0]?.reason).toBe('Traslado')
  })
})
