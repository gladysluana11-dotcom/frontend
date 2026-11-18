import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../../shared/api/errors'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Can } from '../../../shared/ui/can'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { PageFrame } from '../../../shared/ui/page-frame'
import { StatusState } from '../../../shared/ui/status-state'
import { formatDate } from '../../../shared/utils/format'
import { useStudent } from '../../students/hooks/use-students'
import { EnrollmentFees } from '../../fees/components/enrollment-fees'
import { PAYMENT_VIEW_ROLES } from '../roles'
import { useEnrollment } from '../hooks/use-payments'

function description(
  value: string | { nombre: string } | null | undefined,
): string {
  if (typeof value === 'string') return value
  return value?.nombre ?? texts.students.notProvided
}

export default function EnrollmentDetailPage() {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const parsedId = Number(id)
  const enrollmentId =
    Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined
  const queryStudentId = Number(searchParams.get('alumno_id'))
  const enrollment = useEnrollment(enrollmentId)
  const studentId =
    enrollment.data?.alumno_id ??
    enrollment.data?.alumno?.id ??
    (Number.isInteger(queryStudentId) && queryStudentId > 0
      ? queryStudentId
      : undefined)
  const student = useStudent(studentId)

  if (!enrollmentId) {
    return (
      <PageFrame title={texts.students.enrollments}>
        <StatusState
          state="empty"
          title={texts.students.notFoundTitle}
          message={texts.students.notFoundMessage}
        />
      </PageFrame>
    )
  }

  if (enrollment.isPending) {
    return (
      <PageFrame title={texts.students.enrollments}>
        <StatusState state="loading" />
      </PageFrame>
    )
  }

  if (enrollment.isError) {
    const forbidden =
      enrollment.error instanceof ApiError && enrollment.error.status === 403
    return (
      <PageFrame title={texts.students.enrollments}>
        <StatusState
          state="error"
          {...(forbidden ? { title: texts.navigation.forbiddenTitle } : {})}
          message={
            forbidden
              ? texts.payments.errors.forbidden
              : enrollment.error.message
          }
          onRetry={() => void enrollment.refetch()}
        />
      </PageFrame>
    )
  }

  const data = enrollment.data
  const studentName = data.alumno
    ? `${data.alumno.nombre ?? ''} ${data.alumno.apellido ?? ''}`.trim()
    : studentId === undefined
      ? texts.students.notProvided
      : student.data
        ? `${student.data.nombre} ${student.data.apellido}`
        : student.isPending
          ? texts.loading
          : texts.payments.errors.studentName

  return (
    <PageFrame
      eyebrow={texts.students.enrollments}
      title={`${texts.students.enrollments} #${data.id}`}
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/alumnos">{texts.students.back}</Link>
        </Button>
        {studentId ? (
          <Can permiso="pagos.ver" rol={PAYMENT_VIEW_ROLES}>
            <Button asChild>
              <Link to={`/alumnos/${studentId}/estado-cuenta`}>
                {texts.payments.studentAccountLink}
              </Link>
            </Button>
          </Can>
        ) : null}
      </div>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{texts.students.enrollmentDetails}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field
              label={texts.payments.confirmationStudent}
              value={studentName}
            />
            <Field
              label={texts.students.enrollmentYear}
              value={description(data.anio_escolar)}
            />
            <Field
              label={texts.students.enrollmentGrade}
              value={`${description(data.grado)} · ${description(data.seccion)}`}
            />
            <Field
              label={texts.students.enrollmentDate}
              value={
                data.fecha_matricula
                  ? formatDate(data.fecha_matricula)
                  : texts.students.notProvided
              }
            />
            <Field
              label={texts.students.enrollmentStatus}
              value={data.estado ?? texts.students.notProvided}
            />
          </dl>
        </CardContent>
      </Card>
      <Can permiso={['pagos.ver', 'pagos.registrar']} rol={PAYMENT_VIEW_ROLES}>
        <EnrollmentFees enrollmentId={data.id} />
      </Can>
    </PageFrame>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}
