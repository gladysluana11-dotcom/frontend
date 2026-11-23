import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { usePermisos } from '../../../shared/hooks/use-permisos'
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Can } from '../../../shared/ui/can'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { PageFrame } from '../../../shared/ui/page-frame'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { dateInputToday } from '../../../shared/utils/format'
import { gradeLabel } from '../../catalog/api/catalog-api'
import {
  useAcademicYears,
  useGrades,
  useLevels,
  useSections,
} from '../../catalog/hooks/use-catalog'
import {
  useCreateEnrollment,
  useEnrollmentStudent,
  useEnrollmentStudentSearch,
} from '../hooks/use-enrollments'
import { ENROLLMENT_EXCESS_ROLES } from '../roles'
import {
  createEnrollmentSchema,
  type CreateEnrollmentValues,
  type EnrollmentStudent,
} from '../schemas'

const CREATE_FIELDS = [
  'alumno_id',
  'anio_escolar_id',
  'grado_id',
  'seccion_id',
  'fecha_matricula',
  'estado',
  'motivo_exceso',
]

export default function EnrollmentCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialStudentId = searchParams.get('alumno_id') ?? ''
  const t = texts.enrollments
  const { tieneAlgunRol } = usePermisos()
  const canAuthorizeExcess = tieneAlgunRol(ENROLLMENT_EXCESS_ROLES)
  const create = useCreateEnrollment()
  const years = useAcademicYears()
  const levels = useLevels()
  const grades = useGrades()
  const sections = useSections()
  const form = useForm<CreateEnrollmentValues>({
    resolver: zodResolver(createEnrollmentSchema),
    defaultValues: {
      alumno_id: initialStudentId,
      anio_escolar_id: '',
      grado_id: '',
      seccion_id: '',
      fecha_matricula: dateInputToday(),
      estado: 'matriculado',
      autorizar_exceso: false,
      motivo_exceso: '',
    },
  })
  const studentId = Number(form.watch('alumno_id')) || undefined
  const selectedStudentQuery = useEnrollmentStudent(studentId)
  const [selectedStudent, setSelectedStudent] = useState<EnrollmentStudent>()
  const [searchInput, setSearchInput] = useState('')
  const studentSearch = useEnrollmentStudentSearch(
    useDebouncedValue(searchInput, 300),
  )
  const [excessPrompt, setExcessPrompt] = useState(false)
  const [paymentGuardianMissing, setPaymentGuardianMissing] = useState(false)
  const yearId = Number(form.watch('anio_escolar_id'))
  const gradeId = Number(form.watch('grado_id'))
  const authorizingExcess = form.watch('autorizar_exceso')

  useEffect(() => {
    if (
      selectedStudentQuery.data &&
      selectedStudentQuery.data.id === studentId &&
      !selectedStudent
    ) {
      setSelectedStudent(selectedStudentQuery.data)
    }
  }, [selectedStudent, selectedStudentQuery.data, studentId])

  const gradeOptions = useMemo(
    () =>
      (grades.data ?? []).map((grade) => ({
        id: grade.id,
        label: gradeLabel(grade, levels.data ?? []),
      })),
    [grades.data, levels.data],
  )
  const openYears = (years.data ?? []).filter((year) => !year.cerrado)
  const sectionOptions = (sections.data ?? []).filter(
    (section) =>
      section.grado_id === gradeId && section.anio_escolar_id === yearId,
  )

  const chooseStudent = (student: EnrollmentStudent) => {
    setSelectedStudent(student)
    form.setValue('alumno_id', String(student.id), { shouldValidate: true })
    setSearchInput('')
    setPaymentGuardianMissing(false)
  }

  const submit = form.handleSubmit(async (values) => {
    setPaymentGuardianMissing(false)
    try {
      const created = await create.mutateAsync({
        alumno_id: Number(values.alumno_id),
        anio_escolar_id: Number(values.anio_escolar_id),
        grado_id: Number(values.grado_id),
        seccion_id: Number(values.seccion_id),
        fecha_matricula: values.fecha_matricula,
        estado: values.estado,
        ...(values.autorizar_exceso
          ? {
              autorizar_exceso: true,
              motivo_exceso: values.motivo_exceso.trim(),
            }
          : {}),
      })
      toast.success(t.created)
      void navigate(`/matriculas/${created.id}`)
    } catch (error) {
      const fieldError =
        error instanceof ApiError ? error.errors.alumno_id?.[0] : undefined
      if (
        fieldError?.toLocaleLowerCase().includes('responsable') ||
        fieldError?.toLocaleLowerCase().includes('pago')
      ) {
        setPaymentGuardianMissing(true)
      }
      const sectionMessage =
        error instanceof ApiError
          ? (error.errors.seccion_id?.[0] ?? error.message)
          : undefined
      if (sectionMessage?.toLocaleLowerCase().includes('vacante')) {
        if (canAuthorizeExcess) {
          setExcessPrompt(true)
          form.setValue('autorizar_exceso', false)
        } else {
          form.setError('root.server', { message: sectionMessage })
        }
      }
      applyServerErrors(form.setError, error, CREATE_FIELDS)
      if (error instanceof ApiError && error.status === 403) {
        form.setError('root.server', { message: t.serverForbidden })
      } else if (!sectionMessage?.toLocaleLowerCase().includes('vacante')) {
        form.setError('root.server', {
          message: error instanceof Error ? error.message : t.enrollmentError,
        })
      }
    }
  })

  const errors = form.formState.errors

  return (
    <PageFrame
      eyebrow={texts.navigation.enrollments}
      title={t.newTitle}
      description={t.newDescription}
    >
      <div className="max-w-3xl rounded-xl border bg-white p-5 sm:p-6">
        <form className="space-y-5" noValidate onSubmit={submit}>
          <Field
            label={t.chooseStudent}
            htmlFor="student-search"
            error={errors.alumno_id?.message}
            help={
              selectedStudent
                ? `${t.selectedStudent}: ${selectedStudent.apellido}, ${selectedStudent.nombre}`
                : texts.enrollments.studentSearchHelp
            }
          >
            <Input
              id="student-search"
              type="search"
              placeholder={t.searchPlaceholder}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              aria-invalid={Boolean(errors.alumno_id)}
              autoComplete="off"
            />
            {studentSearch.data ? (
              <ul
                className="mt-2 max-h-52 overflow-y-auto rounded-md border"
                aria-label={t.search}
              >
                {studentSearch.data.items.length === 0 ? (
                  <li className="p-3 text-sm text-muted-foreground">
                    {t.noStudents}
                  </li>
                ) : (
                  studentSearch.data.items.map((student) => (
                    <li key={student.id}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => chooseStudent(student)}
                      >
                        {student.apellido}, {student.nombre}
                        {student.documento ? ` · ${student.documento}` : ''}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            ) : null}
          </Field>
          {paymentGuardianMissing && studentId ? (
            <p className="text-sm text-destructive" role="alert">
              {t.noPaymentGuardian}{' '}
              <Link
                className="font-medium underline"
                to={`/alumnos/${studentId}`}
              >
                {t.studentDetails}
              </Link>
            </p>
          ) : null}

          <Field
            label={t.year}
            htmlFor="enrollment-year"
            error={errors.anio_escolar_id?.message}
          >
            <Select
              id="enrollment-year"
              {...form.register('anio_escolar_id', {
                onChange: () => {
                  form.setValue('grado_id', '')
                  form.setValue('seccion_id', '')
                },
              })}
            >
              <option value="">{t.allYears}</option>
              {openYears.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t.grade}
            htmlFor="enrollment-grade"
            error={errors.grado_id?.message}
          >
            <Select
              id="enrollment-grade"
              {...form.register('grado_id', {
                onChange: () => form.setValue('seccion_id', ''),
              })}
            >
              <option value="">{t.allGrades}</option>
              {gradeOptions.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t.section}
            htmlFor="enrollment-section"
            error={errors.seccion_id?.message}
          >
            <Select
              id="enrollment-section"
              disabled={!yearId || !gradeId}
              {...form.register('seccion_id')}
            >
              <option value="">{t.allSections}</option>
              {sectionOptions.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.nombre}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label={t.enrollmentDate}
            htmlFor="enrollment-date"
            error={errors.fecha_matricula?.message}
          >
            <Input
              id="enrollment-date"
              type="date"
              max={dateInputToday()}
              aria-invalid={Boolean(errors.fecha_matricula)}
              {...form.register('fecha_matricula')}
            />
          </Field>
          <Field
            label={t.initialStatus}
            htmlFor="initial-status"
            error={errors.estado?.message}
          >
            <Select id="initial-status" {...form.register('estado')}>
              {(
                ['pre_inscrito', 'pendiente_documentos', 'matriculado'] as const
              ).map((status) => (
                <option key={status} value={status}>
                  {t.states[status]}
                </option>
              ))}
            </Select>
          </Field>
          {excessPrompt ? (
            <div className="space-y-3 rounded-md border p-3">
              <p role="alert" className="text-sm text-destructive">
                {t.noVacancies}
              </p>
              <Can rol={ENROLLMENT_EXCESS_ROLES}>
                <label className="flex items-center gap-2 text-sm font-medium">
                  <input
                    type="checkbox"
                    {...form.register('autorizar_exceso')}
                  />
                  {t.authorizeExcess}
                </label>
                {authorizingExcess ? (
                  <Field
                    label={t.excessReason}
                    htmlFor="excess-reason"
                    error={errors.motivo_exceso?.message}
                  >
                    <Textarea
                      id="excess-reason"
                      {...form.register('motivo_exceso')}
                    />
                  </Field>
                ) : null}
              </Can>
            </div>
          ) : null}
          {errors.root?.server?.message ? (
            <p role="alert" className="text-sm text-destructive">
              {errors.root.server.message}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-3">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? texts.form.saving : t.createSubmit}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => void navigate('/matriculas')}
            >
              {texts.form.cancel}
            </Button>
          </div>
        </form>
      </div>
    </PageFrame>
  )
}
