import { describe, expect, it } from 'vitest'
import {
  collectionFormSchema,
  debtAlertsSchema,
  debtByClassSchema,
  debtPageSchema,
} from './schemas'
import { todayInPeru } from '../payments/schemas'

const debtRow = {
  alumno_id: 7,
  nombre: 'Lucía',
  apellido: 'Torres',
  nivel: 'Primaria',
  grado: 'Segundo',
  seccion: 'B',
  total_vencido: '120.50',
  total_pendiente: 250,
  cuotas_vencidas: 1,
  dias_atraso: 12,
  apoderado_responsable_pago: {
    nombre: 'Rosa',
    apellido: 'Torres',
    telefono: null,
    email: 'rosa@example.edu.pe',
  },
}

describe('debt and collection schemas', () => {
  it('normalizes money text and number values from debt responses', () => {
    const result = debtPageSchema.parse({
      deudas: [debtRow],
      paginacion: {
        pagina: 1,
        por_pagina: 25,
        total: 1,
        ultima_pagina: 1,
      },
    })

    expect(result.deudas[0]).toMatchObject({
      total_vencido: 120.5,
      total_pendiente: 250,
      apoderado_responsable_pago: { email: 'rosa@example.edu.pe' },
    })
  })

  it('validates classroom totals and alert amounts without recalculation', () => {
    const section = debtByClassSchema.parse({
      secciones: [
        {
          seccion_id: 3,
          nivel: 'Primaria',
          grado: 'Segundo',
          seccion: 'B',
          cantidad_alumnos: 1,
          total_vencido: '120.50',
          total_pendiente: '250.00',
          alumnos: [debtRow],
        },
      ],
      filtros: {},
    })
    const alerts = debtAlertsSchema.parse({
      dias_configurados: 5,
      por_vencer: { cantidad: 3, monto: '50.00' },
      vencidas: { cantidad: 2, monto: 120.5 },
    })

    expect(section.secciones[0]?.total_vencido).toBe(120.5)
    expect(alerts.vencidas.monto).toBe(120.5)
    expect(alerts.por_vencer.cantidad).toBe(3)
  })

  it('rejects future collection dates, missing results, and invalid commitment amounts', () => {
    const validValues = {
      fecha: todayInPeru(),
      medio_contacto: 'whatsapp',
      resultado: 'Se envió recordatorio',
      compromiso_pago_fecha: '',
      compromiso_monto: '',
      observacion: '',
    }

    expect(collectionFormSchema.safeParse(validValues).success).toBe(true)
    expect(
      collectionFormSchema.safeParse({
        ...validValues,
        fecha: '9999-12-31',
      }).success,
    ).toBe(false)
    expect(
      collectionFormSchema.safeParse({
        ...validValues,
        resultado: ' ',
        compromiso_monto: '12.345',
      }).success,
    ).toBe(false)
  })

  it('accepts a valid optional commitment and required contact result', () => {
    const parsed = collectionFormSchema.parse({
      fecha: todayInPeru(),
      medio_contacto: 'llamada',
      resultado: 'Respondió y acordó pagar',
      compromiso_pago_fecha: '2026-10-01',
      compromiso_monto: '75.25',
      observacion: 'Registrar seguimiento',
    })

    expect(parsed.compromiso_monto).toBe('75.25')
  })
})
