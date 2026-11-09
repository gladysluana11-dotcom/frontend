import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { texts } from '../../../shared/texts'
import { PageFrame } from '../../../shared/ui/page-frame'
import { StatusState } from '../../../shared/ui/status-state'
import { StudentForm } from '../components/student-form'
import { useStudent } from '../hooks/use-students'
import { useUpdateStudent } from '../hooks/use-student-mutations'
import { changedFields, toFormValues } from '../utils/form-values'

export default function StudentEditPage() {
  const params = useParams()
  const navigate = useNavigate()
  const parsedId = Number(params.id)
  const studentId =
    Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined
  const student = useStudent(studentId)
  const update = useUpdateStudent(studentId ?? 0)

  const title = texts.studentsForm.editTitle

  if (
    studentId === undefined ||
    (student.error instanceof ApiError && student.error.status === 404)
  ) {
    return (
      <PageFrame title={title}>
        <StatusState
          state="empty"
          title={texts.students.notFoundTitle}
          message={texts.students.notFoundMessage}
        />
      </PageFrame>
    )
  }

  if (student.isPending) {
    return (
      <PageFrame title={title}>
        <StatusState state="loading" />
      </PageFrame>
    )
  }

  if (student.isError) {
    return (
      <PageFrame title={title}>
        <StatusState
          state="error"
          message={student.error.message}
          onRetry={() => void student.refetch()}
        />
      </PageFrame>
    )
  }

  const initialValues = toFormValues(student.data)
  const back = `/alumnos/${studentId}`

  return (
    <PageFrame
      eyebrow={texts.navigation.students}
      title={title}
      description={`${student.data.nombre} ${student.data.apellido}`}
    >
      <div className="max-w-3xl rounded-xl border bg-white p-6">
        <StudentForm
          initialValues={initialValues}
          submitLabel={texts.form.save}
          onCancel={() => void navigate(back)}
          onSubmit={async (values) => {
            const changes = changedFields(initialValues, values)
            if (Object.keys(changes).length === 0) {
              toast.info(texts.form.noChanges)
              void navigate(back)
              return
            }
            await update.mutateAsync(changes)
            toast.success(texts.studentsForm.updated)
            void navigate(back)
          }}
        />
      </div>
    </PageFrame>
  )
}
