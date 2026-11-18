import { describe, expect, it } from 'vitest'
import {
  academicYearSchema,
  cashClosureFormSchema,
  cashSummarySchema,
  discountFormSchema,
  gradeSchema,
  tariffFormSchema,
  tariffSchema,
} from './schemas'

const validTariff = {
  anio_escolar_id: '2026',
  grado_id: '3',
  monto_matricula: '250.00',
  monto_pension: '180.50',
  numero_cuotas: '10',
  dia_vencimiento: '28',
  mes_primera_pension: '3',
}

describe('fees schemas', () => {
  it('normalizes money fields returned as strings and numbers', () => {
    expect(
      tariffSchema.parse({
        id: 1,
        anio_escolar_id: 2026,
        grado_id: 3,
        monto_matricula: '250.00',
        monto_pension: 180.5,
        numero_cuotas: 10,
        dia_vencimiento: 28,
        mes_primera_pension: 3,
      }),
    ).toMatchObject({ monto_matricula: 250, monto_pension: 180.5 })

    expect(
      cashSummarySchema.parse({
        fecha: '2026-03-10',
        total: '430.50',
        cantidad_pagos: 2,
        por_usuario: [
          { usuario_id: 1, usuario: 'Elena', cantidad: 2, total: '430.50' },
        ],
        por_medio: [{ medio: 'efectivo', cantidad: 2, total: 430.5 }],
      }).total,
    ).toBe(430.5)
  })

  it('validates tariff limits and allows zero amounts', () => {
    expect(tariffFormSchema.safeParse(validTariff).success).toBe(true)
    expect(
      tariffFormSchema.safeParse({
        ...validTariff,
        monto_matricula: '1.001',
      }).success,
    ).toBe(false)
    expect(
      tariffFormSchema.safeParse({
        ...validTariff,
        monto_pension: '-0.01',
      }).success,
    ).toBe(false)
    expect(
      tariffFormSchema.safeParse({
        ...validTariff,
        numero_cuotas: '13',
        dia_vencimiento: '29',
      }).success,
    ).toBe(false)
  })

  it('requires level information for grade selectors and validates closed years', () => {
    expect(
      gradeSchema.safeParse({ id: 3, nombre: 'Primero', nivel_id: 2 }).success,
    ).toBe(true)
    expect(
      academicYearSchema.parse({
        id: 2026,
        nombre: '2026',
        cerrado: '1',
      }).cerrado,
    ).toBe(true)
    expect(
      academicYearSchema.safeParse({
        id: 2026,
        nombre: '2026',
        cerrado: 'unknown',
      }).success,
    ).toBe(false)
  })

  it('validates discount amount and percentage modes and required reason', () => {
    const base = {
      tipo: 'beca' as const,
      motivo: 'Apoyo por mérito',
    }
    expect(
      discountFormSchema.safeParse({
        ...base,
        modo: 'monto',
        valor: '25.50',
      }).success,
    ).toBe(true)
    expect(
      discountFormSchema.safeParse({
        ...base,
        modo: 'porcentaje',
        valor: '100',
      }).success,
    ).toBe(true)
    expect(
      discountFormSchema.safeParse({
        ...base,
        modo: 'porcentaje',
        valor: '100.01',
      }).success,
    ).toBe(false)
    expect(
      discountFormSchema.safeParse({
        ...base,
        modo: 'monto',
        valor: '25.555',
      }).success,
    ).toBe(false)
    expect(
      discountFormSchema.safeParse({
        ...base,
        motivo: '  ',
        modo: 'porcentaje',
        valor: '10',
      }).success,
    ).toBe(false)
  })

  it('requires a valid non-future date when closing the cashbox', () => {
    expect(
      cashClosureFormSchema.safeParse({
        fecha: '2020-01-01',
        observacion: '',
      }).success,
    ).toBe(true)
    expect(
      cashClosureFormSchema.safeParse({
        fecha: '9999-12-31',
        observacion: '',
      }).success,
    ).toBe(false)
    expect(
      cashClosureFormSchema.safeParse({
        fecha: '',
        observacion: '',
      }).success,
    ).toBe(false)
  })
})
