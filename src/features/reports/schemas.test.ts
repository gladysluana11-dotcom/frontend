import { describe, expect, it } from 'vitest'
import {
  dashboardSchema,
  enrollmentReportSchema,
  monthlyIncomeReportSchema,
  paymentReportSchema,
} from './schemas'

describe('report schemas', () => {
  it('validates matriculation summaries and rows', () => {
    const report = enrollmentReportSchema.parse({
      resumen: { total_matriculas: 42, pendientes_completar: 3 },
      filas: [
        {
          matricula_id: 1,
          alumno_id: 9,
          nombre: 'Lucía',
          apellido: 'Torres',
          anio_escolar: '2026',
          nivel: 'Primaria',
          grado: 'Segundo',
          seccion: 'B',
          estado: 'matriculado',
          documentos_pendientes: 1,
        },
      ],
      filtros: {},
    })

    expect(report.resumen.pendientes_completar).toBe(3)
    expect(report.filas[0]?.alumno_id).toBe(9)
  })

  it('normalizes payment and monthly income amounts from string responses', () => {
    const payments = paymentReportSchema.parse({
      resumen: { cantidad: 2, total_vigente: '350.50' },
      filas: [
        {
          pago_id: 10,
          fecha_pago: '2026-03-20',
          alumno: 'Lucía Torres',
          usuario: 'Ana',
          medio: 'efectivo',
          monto: '125.25',
          estado: 'vigente',
          constancia: 'B001-0010',
        },
      ],
      filtros: {},
    })
    const income = monthlyIncomeReportSchema.parse({
      resumen: { total_emitido: '1000.00', total_cobrado: '550.50' },
      filas: [
        {
          mes: '2026-03',
          cuotas_emitidas: '500.00',
          cuotas_cobradas: '250.50',
        },
      ],
      filtros: {},
    })

    expect(payments.resumen.total_vigente).toBe(350.5)
    expect(payments.filas[0]?.monto).toBe(125.25)
    expect(income.filas[0]?.cuotas_emitidas).toBe(500)
    expect(income.resumen.total_cobrado).toBe(550.5)
  })

  it('validates dashboard response without deriving a total enrollment metric', () => {
    const dashboard = dashboardSchema.parse({
      resumen: {
        matriculados_por_nivel: [
          { nivel_id: 1, nivel: 'Primaria', matriculados: 42 },
        ],
        recaudacion_mes: '400.00',
        deuda_total: '900.00',
        deuda_vencida: '300.00',
        porcentaje_morosidad: '25.00',
      },
      filas: [{ nivel_id: 1, nivel: 'Primaria', matriculados: 42 }],
      filtros: { mes: '2026-11' },
    })

    expect(dashboard.resumen.deuda_total).toBe(900)
    expect(dashboard.resumen.matriculados_por_nivel).toHaveLength(1)
    expect(dashboard.resumen).not.toHaveProperty('total_matriculados')
  })
})
