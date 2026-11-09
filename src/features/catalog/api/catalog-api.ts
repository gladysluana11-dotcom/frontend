import { z } from 'zod'
import { api, executeApi } from '../../../shared/api/client'
import { parseCollection, type Page } from '../../../shared/api/collections'

const MAX_PAGES = 10
const PER_PAGE = 100

export const academicYearSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  activo: z.boolean().optional(),
  cerrado: z.boolean().optional(),
})

export const levelSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  orden: z.number().optional(),
})

export const gradeSchema = z.object({
  id: z.number(),
  nivel_id: z.number(),
  nombre: z.string(),
  orden: z.number().optional(),
})

export const sectionSchema = z.object({
  id: z.number(),
  anio_escolar_id: z.number(),
  grado_id: z.number(),
  nombre: z.string(),
  capacidad: z.number().optional(),
})

export type AcademicYear = z.infer<typeof academicYearSchema>
export type Level = z.infer<typeof levelSchema>
export type Grade = z.infer<typeof gradeSchema>
export type Section = z.infer<typeof sectionSchema>

/** Recorre todas las páginas de un catálogo pequeño (años, niveles, grados, secciones). */
async function fetchAll<T>(
  load: (page: number) => Promise<Page<T>>,
): Promise<T[]> {
  const first = await load(1)
  const items = [...first.items]
  const last = Math.min(first.pagination.lastPage, MAX_PAGES)
  for (let page = 2; page <= last; page += 1) {
    items.push(...(await load(page)).items)
  }
  return items
}

export function listAcademicYears(): Promise<AcademicYear[]> {
  return fetchAll(async (page) =>
    parseCollection(
      await executeApi(() =>
        api.GET('/v1/anios-escolares', {
          params: { query: { page, per_page: PER_PAGE } },
        }),
      ),
      'anios_escolares',
      academicYearSchema,
    ),
  )
}

export function listLevels(): Promise<Level[]> {
  return fetchAll(async (page) =>
    parseCollection(
      await executeApi(() =>
        api.GET('/v1/niveles', {
          params: { query: { page, per_page: PER_PAGE } },
        }),
      ),
      'niveles',
      levelSchema,
    ),
  )
}

export function listGrades(): Promise<Grade[]> {
  return fetchAll(async (page) =>
    parseCollection(
      await executeApi(() =>
        api.GET('/v1/grados', {
          params: { query: { page, per_page: PER_PAGE } },
        }),
      ),
      'grados',
      gradeSchema,
    ),
  )
}

export function listSections(): Promise<Section[]> {
  return fetchAll(async (page) =>
    parseCollection(
      await executeApi(() =>
        api.GET('/v1/secciones', {
          params: { query: { page, per_page: PER_PAGE } },
        }),
      ),
      'secciones',
      sectionSchema,
    ),
  )
}

/** "Primaria · 1.°" evita confundir grados que se llaman igual en distintos niveles. */
export function gradeLabel(grade: Grade, levels: Level[]): string {
  const level = levels.find((item) => item.id === grade.nivel_id)
  return level ? `${level.nombre} · ${grade.nombre}` : grade.nombre
}
