import { describe, expect, it } from 'vitest'
import { amountWithTwoDecimals, moneyToCents, normalizeMoney } from './money'
import {
  paymentFormSchema,
  paymentSchema,
  studentAccountSchema,
  todayInPeru,
} from './schemas'

const formValues = {
  fecha_pago: todayInPeru(),
  monto: '250.00',
  medio: 'efectivo' as const,
  numero_operacion: '',
  observacion: '',
  modo_aplicacion: 'automatica' as const,
  aplicaciones: [],
}

describe('montos', () => {
  it('normaliza una sola vez montos recibidos como texto o número', () => {
    expect(normalizeMoney('250.00')).toBe(250)
    expect(normalizeMoney(1.25)).toBe(1.25)
    expect(amountWithTwoDecimals('250.00')).toBe(250)
    expect(moneyToCents('1.25')).toBe(125)
    expect(moneyToCents('1.255')).toBeUndefined()
  })

  it('valida montos sin más de dos decimales', () => {
    expect(paymentFormSchema.safeParse(formValues).success).toBe(true)
    expect(
      paymentFormSchema.safeParse({ ...formValues, monto: '250.001' }).success,
    ).toBe(false)
  })
})

describe('paymentFormSchema', () => {
  it.each(['deposito', 'transferencia'] as const)(
    'exige número de operación para %s',
    (medio) => {
      const result = paymentFormSchema.safeParse({
        ...formValues,
        medio,
      })
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toContainEqual(
          expect.objectContaining({ path: ['numero_operacion'] }),
        )
      }
    },
  )

  it('acepta un número de operación para depósito y transferencia', () => {
    for (const medio of ['deposito', 'transferencia'] as const) {
      expect(
        paymentFormSchema.safeParse({
          ...formValues,
          medio,
          numero_operacion: 'OP-123',
        }).success,
      ).toBe(true)
    }
  })

  it('valida que la suma de las aplicaciones manuales iguale el monto', () => {
    const applicationValues = {
      ...formValues,
      modo_aplicacion: 'manual' as const,
      aplicaciones: [
        { cuota_id: 1, monto: '100.00' },
        { cuota_id: 2, monto: '150.00' },
      ],
    }
    expect(paymentFormSchema.safeParse(applicationValues).success).toBe(true)
    const invalid = paymentFormSchema.safeParse({
      ...applicationValues,
      aplicaciones: [
        { cuota_id: 1, monto: '100.00' },
        { cuota_id: 2, monto: '149.99' },
      ],
    })
    expect(invalid.success).toBe(false)
    if (!invalid.success) {
      expect(invalid.error.issues).toContainEqual(
        expect.objectContaining({ path: ['aplicaciones'] }),
      )
    }
  })
})

describe('esquemas de respuesta', () => {
  it('valida pagos y normaliza montos de texto en una respuesta', () => {
    const parsed = paymentSchema.parse({
      id: 8,
      matricula_id: 2,
      alumno_id: 4,
      usuario_id: 1,
      fecha_pago: '2026-03-02',
      monto: '250.00',
      medio: 'efectivo',
      numero_operacion: null,
      observacion: null,
      estado: 'vigente',
      constancia: 'B001-0008',
      anulada_en: null,
      motivo_anulacion: null,
      voucher_disponible: false,
    })
    expect(parsed.monto).toBe(250)
  })

  it('valida los totales y cuotas del estado de cuenta sin recalcularlos', () => {
    const account = studentAccountSchema.parse({
      alumno: { id: 4, nombre: 'Ana', apellido: 'Torres' },
      cuotas: [
        {
          id: 20,
          matricula_id: 2,
          alumno_id: 4,
          concepto: 'pension',
          numero: 1,
          descripcion: 'Pensión 1',
          monto_original: '250.00',
          vencimiento: '2026-03-02',
          anulada_en: null,
          saldo: '100.00',
          total_descuentos: '0.00',
          total_pagos: '150.00',
          estado: 'parcial',
        },
      ],
      pagos: [],
      totales: {
        emitido: '250.00',
        pagado: '150.00',
        saldo: '100.00',
        vencido: '0.00',
      },
    })
    expect(account.totales).toEqual({
      emitido: 250,
      pagado: 150,
      saldo: 100,
      vencido: 0,
    })
    expect(account.cuotas[0]?.saldo).toBe(100)
  })
})
