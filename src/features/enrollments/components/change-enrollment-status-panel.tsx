import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { dateInputToday } from '../../../shared/utils/format'
import {
  ENROLLMENT_STATUSES,
  enrollmentStatusSchema,
  type Enrollment,
  type EnrollmentStatusValues,
} from '../schemas'
import { useEnrollmentMutations } from '../hooks/use-enrollments'

export function ChangeEnrollmentStatusPanel({
  enrollment,
  onDone,
}: {
  enrollment: Enrollment
  onDone: () => void
}) {
  const t = texts.enrollments
  const mutations = useEnrollmentMutations(enrollment.id)
  const form = useForm<EnrollmentStatusValues>({
    resolver: zodResolver(enrollmentStatusSchema),
    defaultValues: {
      estado: enrollment.estado,
      motivo: '',
      fecha_retiro: dateInputToday(),
    },
  })
  const state = form.watch('estado')

  const submit = form.handleSubmit(async (values) => {
    if (!window.confirm(t.confirmStatusChange)) return
    try {
      const updated = await mutations.changeStatus.mutateAsync({
        estado: values.estado,
        ...(values.motivo.trim() ? { motivo: values.motivo.trim() } : {}),
        ...(values.estado === 'retirado'
          ? { fecha_retiro: values.fecha_retiro }
          : {}),
      })
      if (
        values.estado === 'matriculado' &&
        updated.estado === 'pendiente_documentos'
      ) {
        toast.warning(t.documentsRemain)
      } else {
        toast.success(t.statusUpdated)
      }
      onDone()
    } catch (error) {
      applyServerErrors(form.setError, error, [
        'estado',
        'motivo',
        'fecha_retiro',
      ])
      form.setError('root.server', {
        message:
          error instanceof ApiError && error.status === 403
            ? t.serverForbidden
            : error instanceof Error
              ? error.message
              : t.enrollmentError,
      })
    }
  })

  return (
    <form
      className="space-y-4 rounded-xl border bg-white p-4"
      aria-label={t.changeStatus}
      noValidate
      onSubmit={submit}
    >
      <h2 className="font-semibold">{t.changeStatus}</h2>
      <Field
        label={t.status}
        htmlFor="enrollment-status"
        error={form.formState.errors.estado?.message}
      >
        <Select id="enrollment-status" {...form.register('estado')}>
          {ENROLLMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {t.states[status]}
            </option>
          ))}
        </Select>
      </Field>
      {state === 'retirado' ? (
        <Field
          label={t.withdrawalDate}
          htmlFor="enrollment-withdrawal-date"
          error={form.formState.errors.fecha_retiro?.message}
        >
          <Input
            id="enrollment-withdrawal-date"
            type="date"
            max={dateInputToday()}
            aria-invalid={Boolean(form.formState.errors.fecha_retiro)}
            {...form.register('fecha_retiro')}
          />
        </Field>
      ) : null}
      {state === 'retirado' || state === 'anulado' ? (
        <Field
          label={t.reason}
          htmlFor="enrollment-status-reason"
          error={form.formState.errors.motivo?.message}
        >
          <Textarea
            id="enrollment-status-reason"
            aria-invalid={Boolean(form.formState.errors.motivo)}
            {...form.register('motivo')}
          />
        </Field>
      ) : null}
      {form.formState.errors.root?.server?.message ? (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.server.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? texts.form.saving : t.saveStatus}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={form.formState.isSubmitting}
          onClick={onDone}
        >
          {texts.form.cancel}
        </Button>
      </div>
    </form>
  )
}
