import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Field } from '../../../shared/ui/field'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { STUDENT_STATUSES } from '../api/students-api'
import { statusChangeSchema, type StatusChangeValues } from '../form-schemas'
import { useUpdateStudent } from '../hooks/use-student-mutations'
import { statusLabel } from '../utils/status'

type ChangeStatusPanelProps = {
  studentId: number
  currentStatus: string
  onDone: () => void
}

export function ChangeStatusPanel({
  studentId,
  currentStatus,
  onDone,
}: ChangeStatusPanelProps) {
  const t = texts.studentsForm
  const update = useUpdateStudent(studentId)
  const form = useForm<StatusChangeValues>({
    resolver: zodResolver(statusChangeSchema),
    defaultValues: { estado: '', motivo: '' },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    try {
      await update.mutateAsync({
        estado: values.estado,
        motivo: values.motivo === '' ? null : values.motivo,
      })
      toast.success(t.statusChanged)
      onDone()
    } catch (error) {
      applyServerErrors(form.setError, error, ['estado', 'motivo'])
      toast.error(
        error instanceof Error ? error.message : texts.form.serverFallback,
      )
    }
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={t.statusTitle}
      className="space-y-4 rounded-xl border bg-white p-4"
    >
      <h2 className="text-base font-semibold">{t.statusTitle}</h2>
      <Field
        label={t.statusNew}
        htmlFor="estado"
        error={errors.estado?.message}
      >
        <Select id="estado" {...form.register('estado')}>
          <option value="">{t.chooseOption}</option>
          {STUDENT_STATUSES.filter((status) => status !== currentStatus).map(
            (status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ),
          )}
        </Select>
      </Field>
      <Field
        label={t.statusReason}
        htmlFor="motivo"
        error={errors.motivo?.message}
        help={t.statusReasonHelp}
      >
        <Textarea
          id="motivo"
          aria-invalid={Boolean(errors.motivo)}
          {...form.register('motivo')}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? texts.form.saving : t.statusSubmit}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onDone}
          disabled={isSubmitting}
        >
          {texts.form.cancel}
        </Button>
      </div>
    </form>
  )
}
