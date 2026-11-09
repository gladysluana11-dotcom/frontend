import { z } from 'zod'
import { ApiError } from './errors'
import { texts } from '../texts'

/** Paginación de las colecciones de la API (`data.paginacion`). */
const paginationSchema = z.object({
  pagina: z.number(),
  por_pagina: z.number(),
  total: z.number(),
  ultima_pagina: z.number(),
})

export type Pagination = {
  page: number
  perPage: number
  total: number
  lastPage: number
}

export type Page<T> = {
  items: T[]
  pagination: Pagination
}

function unexpectedShape(): ApiError {
  return new ApiError(texts.errors.unexpectedShape, { kind: 'http' })
}

/**
 * Lee una respuesta de colección: { data: { [clave]: [...], paginacion: {...} } }.
 * Valida cada elemento; si la forma no es la esperada, falla con un error claro
 * en vez de romper la pantalla más adelante.
 */
export function parseCollection<T>(
  body: unknown,
  key: string,
  itemSchema: z.ZodType<T>,
): Page<T> {
  const envelope = z
    .object({
      data: z.record(z.string(), z.unknown()),
    })
    .safeParse(body)
  if (!envelope.success) throw unexpectedShape()

  const pagination = paginationSchema.safeParse(envelope.data.data.paginacion)
  const items = z.array(itemSchema).safeParse(envelope.data.data[key])
  if (!pagination.success || !items.success) throw unexpectedShape()

  return {
    items: items.data,
    pagination: {
      page: pagination.data.pagina,
      perPage: pagination.data.por_pagina,
      total: pagination.data.total,
      lastPage: Math.max(1, pagination.data.ultima_pagina),
    },
  }
}

/** Lee un recurso único: { data: { [clave]: {...} } }. */
export function parseResource<T>(
  body: unknown,
  key: string,
  schema: z.ZodType<T>,
): T {
  const envelope = z
    .object({ data: z.record(z.string(), z.unknown()) })
    .safeParse(body)
  if (!envelope.success) throw unexpectedShape()

  const resource = schema.safeParse(envelope.data.data[key])
  if (!resource.success) throw unexpectedShape()
  return resource.data
}

/** Lee la carga completa de `data` cuando no es una colección ni un recurso único. */
export function parseData<T>(body: unknown, schema: z.ZodType<T>): T {
  const envelope = z.object({ data: z.unknown() }).safeParse(body)
  if (!envelope.success) throw unexpectedShape()

  const data = schema.safeParse(envelope.data.data)
  if (!data.success) throw unexpectedShape()
  return data.data
}
