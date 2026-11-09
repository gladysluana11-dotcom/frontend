import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { parseCollection, parseData, parseResource } from './collections'
import { ApiError } from './errors'

const item = z.object({ id: z.number(), nombre: z.string() })

const pagination = {
  pagina: 2,
  por_pagina: 25,
  total: 60,
  ultima_pagina: 3,
  siguiente: 'http://localhost:8000/api/v1/x?page=3',
  anterior: null,
}

describe('parseCollection', () => {
  it('lee los elementos y la paginación', () => {
    const result = parseCollection(
      { data: { alumnos: [{ id: 1, nombre: 'Ana' }], paginacion: pagination } },
      'alumnos',
      item,
    )

    expect(result.items).toEqual([{ id: 1, nombre: 'Ana' }])
    expect(result.pagination).toEqual({
      page: 2,
      perPage: 25,
      total: 60,
      lastPage: 3,
    })
  })

  it('falla con un error claro si la forma no es la esperada', () => {
    expect(() =>
      parseCollection(
        { data: { alumnos: [{ id: 'x' }], paginacion: pagination } },
        'alumnos',
        item,
      ),
    ).toThrow(ApiError)
    expect(() => parseCollection({ data: {} }, 'alumnos', item)).toThrow(
      ApiError,
    )
    expect(() => parseCollection(null, 'alumnos', item)).toThrow(ApiError)
  })
})

describe('parseResource y parseData', () => {
  it('lee un recurso único', () => {
    expect(
      parseResource(
        { data: { alumno: { id: 1, nombre: 'Ana' } } },
        'alumno',
        item,
      ),
    ).toEqual({
      id: 1,
      nombre: 'Ana',
    })
  })

  it('falla si falta el recurso', () => {
    expect(() => parseResource({ data: {} }, 'alumno', item)).toThrow(ApiError)
  })

  it('lee la carga completa de data', () => {
    expect(parseData({ data: { id: 3, nombre: 'Luis' } }, item)).toEqual({
      id: 3,
      nombre: 'Luis',
    })
  })
})
