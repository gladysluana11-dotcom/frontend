import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { texts } from '../../../shared/texts'
import { PageFrame } from '../../../shared/ui/page-frame'
import { StudentForm } from '../components/student-form'
import { emptyStudentForm } from '../form-schemas'
import { useCreateStudent } from '../hooks/use-student-mutations'

export default function StudentCreatePage() {
  const navigate = useNavigate()
  const create = useCreateStudent()

  return (
    <PageFrame
      eyebrow={texts.navigation.students}
      title={texts.studentsForm.newTitle}
      description={texts.studentsForm.newDescription}
    >
      <div className="max-w-3xl rounded-xl border bg-white p-6">
        <StudentForm
          initialValues={emptyStudentForm}
          submitLabel={texts.studentsForm.createSubmit}
          onCancel={() => void navigate('/alumnos')}
          onSubmit={async (values) => {
            const created = await create.mutateAsync(values)
            toast.success(texts.studentsForm.created)
            void navigate(created ? `/alumnos/${created.id}` : '/alumnos')
          }}
        />
      </div>
    </PageFrame>
  )
}
