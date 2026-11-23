import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { toast } from 'sonner'
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
import { ChangeEnrollmentSectionPanel } from '../components/change-enrollment-section-panel'
import { ChangeEnrollmentStatusPanel } from '../components/change-enrollment-status-panel'
import { EnrollmentDocuments } from '../components/enrollment-documents'
import { EnrollmentStatusBadge } from '../components/enrollment-status-badge'
import { useEnrollment, useEnrollmentMutations } from '../hooks/use-enrollments'
import { ENROLLMENT_MANAGE_ROLES } from '../roles'

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
      <dd className="mt-1 font-medium">{value || '—'}</dd>
    </div>
  )
}

export default function EnrollmentDetailPage() {
  const parsedId = Number(useParams().id)
  const enrollmentId =
    Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined
  const enrollment = useEnrollment(enrollmentId)
  const mutations = useEnrollmentMutations(enrollmentId ?? 0)
  const [panel, setPanel] = useState<'status' | 'section' | null>(null)

  if (
    enrollmentId === undefined ||
    (enrollment.error instanceof ApiError && enrollment.error.status === 404)
  ) {
    return (
      <PageFrame title={texts.enrollments.detailTitle}>
        <Link className="mb-4 inline-block text-sm underline" to="/matriculas">
          {texts.enrollments.backToList}
        </Link>
        <StatusState state="empty" message={texts.enrollments.notFound} />
      </PageFrame>
    )
  }
  if (enrollment.error instanceof ApiError && enrollment.error.status === 403) {
    return (
      <PageFrame title={texts.navigation.forbiddenTitle}>
        <StatusState state="error" message={texts.enrollments.forbidden} />
      </PageFrame>
    )
  }
  if (enrollment.isPending) {
    return (
      <PageFrame title={texts.enrollments.detailTitle}>
        <StatusState state="loading" />
      </PageFrame>
    )
  }
  if (enrollment.isError) {
    return (
      <PageFrame title={texts.enrollments.detailTitle}>
        <StatusState
          state="error"
          message={enrollment.error.message}
          onRetry={() => void enrollment.refetch()}
        />
      </PageFrame>
    )
  }

  const data = enrollment.data

  const onDocumentUpdate = async (
    document: (typeof data.documentos)[number],
    estado: 'pendiente' | 'entregado',
    fecha_entrega?: string,
  ) => {
    await mutations.updateDocument.mutateAsync({
      documentId: document.id,
      values: {
        estado,
        ...(fecha_entrega ? { fecha_entrega } : {}),
      },
    })
    toast.success(texts.enrollments.documentUpdated)
  }

  const download = async () => {
    try {
      await mutations.downloadFicha.mutateAsync(data.id)
      toast.success(texts.enrollments.fichaDownloaded)
    } catch (error) {
      toast.error(
        error instanceof ApiError && error.status === 403
          ? texts.enrollments.serverForbidden
          : error instanceof Error
            ? error.message
            : texts.enrollments.enrollmentError,
      )
    }
  }

  return (
    <PageFrame
      eyebrow={texts.navigation.enrollments}
      title={`${texts.enrollments.detailTitle} #${data.id}`}
    >
      <Link className="mb-4 inline-block text-sm underline" to="/matriculas">
        {texts.enrollments.backToList}
      </Link>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <EnrollmentStatusBadge status={data.estado} />
        <Can rol={ENROLLMENT_MANAGE_ROLES}>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPanel(panel === 'status' ? null : 'status')}
          >
            {texts.enrollments.changeStatus}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setPanel(panel === 'section' ? null : 'section')}
          >
            {texts.enrollments.changeSection}
          </Button>
        </Can>
        <Button
          type="button"
          onClick={() => void download()}
          disabled={mutations.downloadFicha.isPending}
        >
          {mutations.downloadFicha.isPending
            ? texts.form.saving
            : texts.enrollments.downloadFicha}
        </Button>
      </div>
      {panel === 'status' ? (
        <div className="mb-5 max-w-xl">
          <ChangeEnrollmentStatusPanel
            enrollment={data}
            onDone={() => setPanel(null)}
          />
        </div>
      ) : null}
      {panel === 'section' ? (
        <div className="mb-5 max-w-xl">
          <ChangeEnrollmentSectionPanel
            enrollment={data}
            onDone={() => setPanel(null)}
          />
        </div>
      ) : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {texts.enrollments.detailTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2">
              <dt className="text-sm text-muted-foreground">
                {texts.enrollments.columnStudent}
              </dt>
              <dd className="mt-1 font-medium">
                <Link
                  className="text-[var(--school-primary)] hover:underline"
                  to={`/alumnos/${data.alumno.id}`}
                >
                  {data.alumno.apellido}, {data.alumno.nombre}
                </Link>
              </dd>
            </div>
            <Field label={texts.enrollments.year} value={data.anio_escolar} />
            <Field label={texts.enrollments.grade} value={data.grado} />
            <Field label={texts.enrollments.section} value={data.seccion} />
            <Field
              label={texts.enrollments.enrollmentDate}
              value={formatDate(data.fecha_matricula)}
            />
            <Field
              label={texts.studentsForm.lastName}
              value={
                data.usuario_registro
                  ? `${data.usuario_registro.nombre} ${data.usuario_registro.apellido}`
                  : null
              }
            />
            <Field
              label={texts.students.enrollmentWithdrawal}
              value={
                data.fecha_retiro
                  ? `${formatDate(data.fecha_retiro)}${data.motivo ? ` · ${data.motivo}` : ''}`
                  : null
              }
            />
          </dl>
        </CardContent>
      </Card>
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">
            {texts.enrollments.documents}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <EnrollmentDocuments
            documents={data.documentos}
            isUpdating={mutations.updateDocument.isPending}
            onUpdate={onDocumentUpdate}
          />
        </CardContent>
      </Card>
    </PageFrame>
  )
}
