import { api, executeApi } from '../../../shared/api/client'
import {
  parseCollection,
  parseData,
  parseResource,
  type Page,
} from '../../../shared/api/collections'
import type { z } from 'zod'
import { ApiError } from '../../../shared/api/errors'
import type { SortDirection } from '../../../shared/hooks/use-table-state'
import type {
  GuardianLinkValues,
  GuardianNewValues,
  StudentFormValues,
} from '../form-schemas'
import {
  guardianListItemSchema,
  studentDetailSchema,
  studentHistorySchema,
  studentListItemSchema,
  type Guardian,
  type StudentDetail,
  type StudentHistory,
  type StudentListItem,
} from '../schemas'

export const STUDENT_STATUSES = ['activo', 'retirado', 'egresado'] as const
export const STUDENT_SORT_KEYS = [
  'id',
  'nombre',
  'apellido',
  'estado',
  'created_at',
] as const

type StudentStatus = (typeof STUDENT_STATUSES)[number]
type StudentSortKey = (typeof STUDENT_SORT_KEYS)[number]

export type StudentListParams = {
  page: number
  perPage: number
  search?: string | undefined
  sort?: string | undefined
  direction?: SortDirection
  status?: string | undefined
  academicYearId?: string | undefined
  gradeId?: string | undefined
  sectionId?: string | undefined
}

function asStatus(value: string | undefined): StudentStatus | undefined {
  return STUDENT_STATUSES.find((status) => status === value)
}

function asSortKey(value: string | undefined): StudentSortKey | undefined {
  return STUDENT_SORT_KEYS.find((key) => key === value)
}

function asId(value: string | undefined): number | undefined {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

export async function listStudents(
  params: StudentListParams,
): Promise<Page<StudentListItem>> {
  const sort = asSortKey(params.sort)
  const status = asStatus(params.status)
  const academicYearId = asId(params.academicYearId)
  const gradeId = asId(params.gradeId)
  const sectionId = asId(params.sectionId)

  const body = await executeApi(() =>
    api.GET('/v1/alumnos', {
      params: {
        query: {
          page: params.page,
          per_page: params.perPage,
          ...(params.search ? { buscar: params.search } : {}),
          ...(sort ? { sort, direction: params.direction ?? 'asc' } : {}),
          ...(status ? { estado: status } : {}),
          ...(academicYearId ? { anio_escolar_id: academicYearId } : {}),
          ...(gradeId ? { grado_id: gradeId } : {}),
          ...(sectionId ? { seccion_id: sectionId } : {}),
        },
      },
    }),
  )
  return parseCollection(body, 'alumnos', studentListItemSchema)
}

export async function getStudent(id: number): Promise<StudentDetail> {
  const body = await executeApi(() =>
    api.GET('/v1/alumnos/{id}', { params: { path: { id: String(id) } } }),
  )
  return parseResource(body, 'alumno', studentDetailSchema)
}

export async function getStudentHistory(id: number): Promise<StudentHistory> {
  const body = await executeApi(() =>
    api.GET('/v1/alumnos/{alumno}/historial', {
      params: { path: { alumno: id } },
    }),
  )
  return parseData(body, studentHistorySchema)
}

/** Foto desde el endpoint autenticado. Si el alumno no tiene foto devuelve null. */
export async function getStudentPhoto(id: number): Promise<Blob | null> {
  try {
    return (await executeApi(() =>
      api.GET('/v1/alumnos/{alumno}/foto', {
        params: { path: { alumno: id } },
        parseAs: 'blob',
      }),
    )) as unknown as Blob
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null
    throw error
  }
}

/**
 * Las escrituras ya se guardaron cuando llega la respuesta: si el cuerpo no tiene la forma
 * esperada no se muestra un error (el usuario podría repetir la operación y duplicarla).
 */
function readCreated<T>(
  body: unknown,
  key: string,
  schema: z.ZodType<T>,
): T | undefined {
  try {
    return parseResource(body, key, schema)
  } catch {
    return undefined
  }
}

export async function createStudent(
  values: StudentFormValues,
): Promise<StudentDetail | undefined> {
  const body = await executeApi(() =>
    api.POST('/v1/alumnos', { body: { ...values } }),
  )
  return readCreated(body, 'alumno', studentDetailSchema)
}

export type StudentChanges = Partial<StudentFormValues> & {
  estado?: string
  motivo?: string | null
}

export async function updateStudent(
  id: number,
  changes: StudentChanges,
): Promise<void> {
  const { estado, motivo, ...rest } = changes
  const status = asStatus(estado)
  await executeApi(() =>
    api.PATCH('/v1/alumnos/{id}', {
      params: { path: { id: String(id) } },
      body: {
        ...rest,
        ...(status ? { estado: status } : {}),
        ...(motivo !== undefined ? { motivo } : {}),
      },
    }),
  )
}

export async function uploadStudentPhoto(
  id: number,
  file: File,
): Promise<void> {
  await executeApi(() =>
    api.POST('/v1/alumnos/{alumno}/foto', {
      params: { path: { alumno: id } },
      body: { foto: file as unknown as string },
      bodySerializer: () => {
        const data = new FormData()
        data.append('foto', file)
        return data
      },
    }),
  )
}

export async function searchGuardians(search: string): Promise<Page<Guardian>> {
  const body = await executeApi(() =>
    api.GET('/v1/apoderados', {
      params: { query: { page: 1, per_page: 10, buscar: search } },
    }),
  )
  return parseCollection(body, 'apoderados', guardianListItemSchema)
}

function emptyToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}

export async function createGuardian(
  studentId: number,
  values: GuardianNewValues,
): Promise<Guardian | undefined> {
  const body = await executeApi(() =>
    api.POST('/v1/alumnos/{alumno}/apoderados', {
      params: { path: { alumno: studentId } },
      body: {
        nombre: values.nombre,
        apellido: values.apellido,
        parentesco: values.parentesco,
        telefono: emptyToNull(values.telefono),
        email: emptyToNull(values.email),
        responsable_pago: values.responsable_pago,
      },
    }),
  )
  return readCreated(body, 'apoderado', guardianListItemSchema)
}

export async function linkGuardian(
  studentId: number,
  guardianId: number,
  values: GuardianLinkValues,
): Promise<void> {
  await executeApi(() =>
    api.PUT('/v1/alumnos/{alumno}/apoderados/{apoderado}', {
      params: { path: { alumno: studentId, apoderado: guardianId } },
      body: {
        parentesco: values.parentesco,
        telefono: emptyToNull(values.telefono),
        email: emptyToNull(values.email),
        responsable_pago: values.responsable_pago,
      },
    }),
  )
}
