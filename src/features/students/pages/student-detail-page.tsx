import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { ApiError } from '../../../shared/api/errors'
import { usePermisos } from '../../../shared/hooks/use-permisos'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { Can } from '../../../shared/ui/can'
import { PageFrame } from '../../../shared/ui/page-frame'
import { StatusState } from '../../../shared/ui/status-state'
import { formatDate } from '../../../shared/utils/format'
import { ChangeStatusPanel } from '../components/change-status-panel'
import { GuardiansCard } from '../components/guardians-card'
import { HistoryTimeline } from '../components/history-timeline'
import { PhotoUpload } from '../components/photo-upload'
import { StatusBadge } from '../components/status-badge'
import { StudentPhoto } from '../components/student-photo'
import { useStudent, useStudentHistory } from '../hooks/use-students'
import { STUDENT_WRITE_ROLES } from '../roles'

function sexLabel(value: string | null | undefined): string {
  if (value === 'M') return texts.students.male
  if (value === 'F') return texts.students.female
  return texts.students.notProvided
}

function Field({
  label,
  value,
}: {
  label: string
  value: string | null | undefined
}) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">
        {value || texts.students.notProvided}
      </dd>
    </div>
  )
}

export default function StudentDetailPage() {
  const params = useParams()
  const parsedId = Number(params.id)
  const studentId =
    Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined

  const student = useStudent(studentId)
  const history = useStudentHistory(studentId)
  const { tieneAlgunRol } = usePermisos()
  const [changingStatus, setChangingStatus] = useState(false)

  const back = (
    <Link
      to="/alumnos"
      className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-[var(--school-primary)] hover:underline"
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {texts.students.back}
    </Link>
  )

  if (
    studentId === undefined ||
    (student.error instanceof ApiError && student.error.status === 404)
  ) {
    return (
      <PageFrame title={texts.students.notFoundTitle}>
        {back}
        <StatusState
          state="empty"
          title={texts.students.notFoundTitle}
          message={texts.students.notFoundMessage}
        />
      </PageFrame>
    )
  }

  if (student.error instanceof ApiError && student.error.status === 403) {
    return (
      <PageFrame title={texts.navigation.forbiddenTitle}>
        {back}
        <StatusState
          state="error"
          title={texts.navigation.forbiddenTitle}
          message={texts.students.forbiddenMessage}
        />
      </PageFrame>
    )
  }

  if (student.isPending) {
    return (
      <PageFrame title={texts.students.detailTitle}>
        {back}
        <StatusState state="loading" />
      </PageFrame>
    )
  }

  if (student.isError) {
    return (
      <PageFrame title={texts.students.detailTitle}>
        {back}
        <StatusState
          state="error"
          message={student.error.message}
          onRetry={() => void student.refetch()}
        />
      </PageFrame>
    )
  }

  const data = student.data
  const fullName = `${data.nombre} ${data.apellido}`

  return (
    <PageFrame eyebrow={texts.students.detailTitle} title={fullName}>
      {back}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <StatusBadge status={data.estado} />
        <Can rol={STUDENT_WRITE_ROLES}>
          <Button asChild variant="outline" size="sm">
            <Link to={`/alumnos/${data.id}/editar`}>
              {texts.studentsForm.editButton}
            </Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={changingStatus}
            onClick={() => setChangingStatus((open) => !open)}
          >
            {texts.studentsForm.statusTitle}
          </Button>
        </Can>
      </div>

      {changingStatus ? (
        <div className="mb-6 max-w-xl">
          <ChangeStatusPanel
            studentId={data.id}
            currentStatus={data.estado}
            onDone={() => setChangingStatus(false)}
          />
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{texts.students.photo}</CardTitle>
          </CardHeader>
          <CardContent>
            <StudentPhoto
              studentId={data.id}
              name={fullName}
              hasPhoto={Boolean(data.foto_url)}
            />
            <Can rol={STUDENT_WRITE_ROLES}>
              <PhotoUpload studentId={data.id} />
            </Can>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {texts.students.personalData}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field
                label={texts.students.documentType}
                value={data.tipo_documento}
              />
              <Field
                label={texts.students.documentNumber}
                value={data.documento_identidad}
              />
              <Field
                label={texts.students.birthDate}
                value={
                  data.fecha_nacimiento
                    ? formatDate(data.fecha_nacimiento)
                    : null
                }
              />
              <Field label={texts.students.sex} value={sexLabel(data.sexo)} />
              <div className="sm:col-span-2">
                <Field label={texts.students.address} value={data.direccion} />
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>

      <GuardiansCard
        studentId={data.id}
        guardians={data.apoderados}
        canEdit={tieneAlgunRol(STUDENT_WRITE_ROLES)}
      />

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">
            {texts.students.enrollments}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {history.isPending ? (
            <StatusState state="loading" />
          ) : history.isError ? (
            <StatusState
              state="error"
              message={history.error.message}
              onRetry={() => void history.refetch()}
            />
          ) : history.data.matriculas.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {texts.students.noEnrollments}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <caption className="sr-only">
                  {texts.students.enrollments}
                </caption>
                <thead className="text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      {texts.students.enrollmentYear}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      {texts.students.enrollmentGrade}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      {texts.students.enrollmentDate}
                    </th>
                    <th scope="col" className="py-2 pr-4 font-semibold">
                      {texts.students.enrollmentStatus}
                    </th>
                    <th scope="col" className="py-2 font-semibold">
                      {texts.students.enrollmentWithdrawal}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {history.data.matriculas.map((enrollment) => (
                    <tr key={enrollment.id}>
                      <td className="py-2 pr-4">
                        {enrollment.anio_escolar ?? '—'}
                      </td>
                      <td className="py-2 pr-4">
                        {`${enrollment.grado ?? ''} ${enrollment.seccion ?? ''}`.trim() ||
                          '—'}
                      </td>
                      <td className="py-2 pr-4">
                        {enrollment.fecha_matricula
                          ? formatDate(enrollment.fecha_matricula)
                          : '—'}
                      </td>
                      <td className="py-2 pr-4">
                        {enrollment.estado ? (
                          <StatusBadge status={enrollment.estado} />
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="py-2">
                        {enrollment.fecha_retiro
                          ? `${formatDate(enrollment.fecha_retiro)}${enrollment.motivo ? ` · ${enrollment.motivo}` : ''}`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">{texts.students.history}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.isPending ? (
            <StatusState state="loading" />
          ) : history.isError ? null : (
            <HistoryTimeline history={history.data} />
          )}
        </CardContent>
      </Card>
    </PageFrame>
  )
}
