import { z } from 'zod'
import { api, executeApi } from '../../../shared/api/client'
import {
  parseCollection,
  parseData,
  parseResource,
  type Page,
} from '../../../shared/api/collections'
import type { SortDirection } from '../../../shared/hooks/use-table-state'
import { downloadBlob } from '../../../shared/utils/download'
import {
  enrollmentListItemSchema,
  enrollmentMutationSchema,
  enrollmentSchema,
  enrollmentDocumentSchema,
  enrollmentStudentSchema,
  ENROLLMENT_STATUSES,
  requiredDocumentSchema,
  type Enrollment,
  type EnrollmentMutation,
  type EnrollmentListItem,
  type EnrollmentStudent,
  type RequiredDocument,
} from '../schemas'

export const ENROLLMENT_SORT_KEYS = [
  'id',
  'anio_escolar_id',
  'grado_id',
  'seccion_id',
  'fecha_matricula',
  'estado',
] as const

export type EnrollmentListParams = {
  page: number
  perPage: number
  search?: string | undefined
  sort?: string | undefined
  direction?: SortDirection
  academicYearId?: string | undefined
  gradeId?: string | undefined
  sectionId?: string | undefined
  studentId?: string | undefined
  status?: string | undefined
}

function positiveId(value: string | undefined): number | undefined {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function validSort(value: string | undefined) {
  return ENROLLMENT_SORT_KEYS.find((key) => key === value)
}

export async function listEnrollments(
  params: EnrollmentListParams,
): Promise<Page<EnrollmentListItem>> {
  const sort = validSort(params.sort)
  const academicYearId = positiveId(params.academicYearId)
  const gradeId = positiveId(params.gradeId)
  const sectionId = positiveId(params.sectionId)
  const studentId = positiveId(params.studentId)
  const status = ENROLLMENT_STATUSES.find((item) => item === params.status)
  const body = await executeApi(() =>
    api.GET('/v1/matriculas', {
      params: {
        query: {
          page: params.page,
          per_page: params.perPage,
          ...(params.search ? { buscar: params.search } : {}),
          ...(sort ? { sort, direction: params.direction ?? 'asc' } : {}),
          ...(academicYearId !== undefined
            ? { anio_escolar_id: academicYearId }
            : {}),
          ...(gradeId !== undefined ? { grado_id: gradeId } : {}),
          ...(sectionId !== undefined ? { seccion_id: sectionId } : {}),
          ...(studentId !== undefined ? { alumno_id: studentId } : {}),
          ...(status ? { estado: status } : {}),
        },
      },
    }),
  )
  return parseCollection(body, 'matriculas', enrollmentListItemSchema)
}

export async function getEnrollment(id: number): Promise<Enrollment> {
  const body = await executeApi(() =>
    api.GET('/v1/matriculas/{matricula}', {
      params: { path: { matricula: id } },
    }),
  )
  return parseResource(body, 'matricula', enrollmentSchema)
}

export async function searchEnrollmentStudents(
  search: string,
): Promise<Page<EnrollmentStudent>> {
  const body = await executeApi(() =>
    api.GET('/v1/alumnos', {
      params: { query: { page: 1, per_page: 20, buscar: search } },
    }),
  )
  return parseCollection(body, 'alumnos', enrollmentStudentSchema)
}

export async function getEnrollmentStudent(
  id: number,
): Promise<EnrollmentStudent> {
  const body = await executeApi(() =>
    api.GET('/v1/alumnos/{id}', { params: { path: { id: String(id) } } }),
  )
  return parseResource(body, 'alumno', enrollmentStudentSchema)
}

export async function createEnrollment(values: {
  alumno_id: number
  anio_escolar_id: number
  grado_id: number
  seccion_id: number
  fecha_matricula: string
  estado: 'pre_inscrito' | 'pendiente_documentos' | 'matriculado'
  autorizar_exceso?: boolean
  motivo_exceso?: string
}): Promise<EnrollmentMutation> {
  const body = await executeApi(() =>
    api.POST('/v1/matriculas', { body: values }),
  )
  return parseResource(body, 'matricula', enrollmentMutationSchema)
}

export async function changeEnrollmentStatus(
  id: number,
  values: {
    estado: (typeof ENROLLMENT_STATUSES)[number]
    motivo?: string
    fecha_retiro?: string
  },
): Promise<EnrollmentMutation> {
  const body = await executeApi(() =>
    api.POST('/v1/matriculas/{matricula}/estado', {
      params: { path: { matricula: id } },
      body: {
        estado: values.estado,
        ...(values.motivo ? { motivo: values.motivo } : {}),
        ...(values.fecha_retiro ? { fecha_retiro: values.fecha_retiro } : {}),
      },
    }),
  )
  return parseResource(body, 'matricula', enrollmentMutationSchema)
}

export async function changeEnrollmentSection(
  id: number,
  values: {
    grado_id: number
    seccion_id: number
    motivo: string
    fecha: string
    autorizar_exceso?: boolean
    motivo_exceso?: string
  },
): Promise<EnrollmentMutation> {
  const body = await executeApi(() =>
    api.POST('/v1/matriculas/{matricula}/cambiar-seccion', {
      params: { path: { matricula: id } },
      body: values,
    }),
  )
  return parseResource(body, 'matricula', enrollmentMutationSchema)
}

export async function updateEnrollmentDocument(
  id: number,
  values: { estado: 'pendiente' | 'entregado'; fecha_entrega?: string },
): Promise<void> {
  const body = await executeApi(() =>
    api.PATCH('/v1/matricula-documentos/{documento}', {
      params: { path: { documento: id } },
      body: {
        estado: values.estado,
        ...(values.fecha_entrega
          ? { fecha_entrega: values.fecha_entrega }
          : {}),
      },
    }),
  )
  parseResource(body, 'documento', enrollmentDocumentSchema)
}

export async function listRequiredDocuments(): Promise<RequiredDocument[]> {
  const body = await executeApi(() => api.GET('/v1/documentos-requeridos', {}))
  const parsed = parseData(
    body,
    z.object({ documentos: z.array(requiredDocumentSchema) }),
  )
  return parsed.documentos
}

export async function createRequiredDocument(
  values: Pick<RequiredDocument, 'nombre' | 'obligatorio' | 'activo'>,
): Promise<RequiredDocument> {
  const body = await executeApi(() =>
    api.POST('/v1/documentos-requeridos', { body: values }),
  )
  return parseResource(body, 'documento', requiredDocumentSchema)
}

export async function updateRequiredDocument(
  id: number,
  values: Pick<RequiredDocument, 'nombre' | 'obligatorio' | 'activo'>,
): Promise<RequiredDocument> {
  const body = await executeApi(() =>
    api.PUT('/v1/documentos-requeridos/{documento}', {
      params: { path: { documento: id } },
      body: values,
    }),
  )
  return parseResource(body, 'documento', requiredDocumentSchema)
}

export async function downloadEnrollmentFicha(id: number): Promise<void> {
  const blob = (await executeApi(() =>
    api.GET('/v1/matriculas/{matricula}/ficha', {
      params: { path: { matricula: id } },
      parseAs: 'blob',
    }),
  )) as Blob
  downloadBlob(blob, `ficha-matricula-${id}.pdf`)
}

const guardianAssociationSchema = z.object({
  id: z.number(),
  parentesco: z.string().nullable().optional(),
  telefono: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  correo: z.string().nullable().optional(),
  responsable_pago: z.boolean().nullable().optional(),
})

const guardianWithStudentsSchema = z.object({
  id: z.number(),
  nombre: z.string(),
  apellido: z.string(),
  alumnos: z.array(guardianAssociationSchema).optional(),
})

export type StudentGuardian = {
  id: number
  nombre: string
  apellido: string
  parentesco?: string | null | undefined
  telefono?: string | null | undefined
  email?: string | null | undefined
  responsable_pago?: boolean | null | undefined
}

export async function listStudentGuardians(
  studentId: number,
): Promise<StudentGuardian[]> {
  const loadPage = async (page: number) => {
    const body = await executeApi(() =>
      api.GET('/v1/apoderados', {
        params: { query: { page, per_page: 100 } },
      }),
    )
    return parseCollection(body, 'apoderados', guardianWithStudentsSchema)
  }
  const first = await loadPage(1)
  const guardians = [...first.items]
  const last = Math.min(5, first.pagination.lastPage)
  for (let page = 2; page <= last; page += 1) {
    guardians.push(...(await loadPage(page)).items)
  }
  return guardians.flatMap((guardian) => {
    const relation = guardian.alumnos?.find(
      (student) => student.id === studentId,
    )
    return relation
      ? [
          {
            id: guardian.id,
            nombre: guardian.nombre,
            apellido: guardian.apellido,
            ...(relation.parentesco !== undefined
              ? { parentesco: relation.parentesco }
              : {}),
            ...(relation.telefono !== undefined
              ? { telefono: relation.telefono }
              : {}),
            ...(relation.email !== undefined || relation.correo !== undefined
              ? { email: relation.email ?? relation.correo }
              : {}),
            ...(relation.responsable_pago !== undefined
              ? { responsable_pago: relation.responsable_pago }
              : {}),
          },
        ]
      : []
  })
}
