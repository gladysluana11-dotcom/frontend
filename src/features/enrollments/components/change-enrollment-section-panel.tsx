import { zodResolver } from '@hookform/resolvers/zod'
import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { usePermisos } from '../../../shared/hooks/use-permisos'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { dateInputToday } from '../../../shared/utils/format'
import { gradeLabel } from '../../catalog/api/catalog-api'
import {
  useGrades,
  useLevels,
  useSections,
} from '../../catalog/hooks/use-catalog'
import { ENROLLMENT_EXCESS_ROLES } from '../roles'
import {
  changeSectionSchema,
  type ChangeSectionValues,
  type Enrollment,
} from '../schemas'
import { useEnrollmentMutations } from '../hooks/use-enrollments'

export function ChangeEnrollmentSectionPanel({
  enrollment,
  onDone,
}: {
  enrollment: Enrollment
  onDone: () => void
}) {
  const t = texts.enrollments
  const mutations = useEnrollmentMutations(enrollment.id)
  const form = useForm<ChangeSectionValues>({
    resolver: zodResolver(changeSectionSchema),
    defaultValues: {
      grado_id: String(enrollment.grado_id),
      seccion_id: String(enrollment.seccion_id),
      motivo: '',
      fecha: dateInputToday(),
      autorizar_exceso: false,
      motivo_exceso: '',
    },
  })
  const grades = useGrades()
  const levels = useLevels()
  const sections = useSections()
  const { tieneAlgunRol } = usePermisos()
  const gradeId = Number(form.watch('grado_id'))
  const [allowExcessPrompt, setAllowExcessPrompt] = useState(false)
  const [apiSectionError, setApiSectionError] = useState('')
  const gradeOptions = useMemo(
    () =>
      (grades.data ?? []).map((grade) => ({
        id: grade.id,
        label: gradeLabel(grade, levels.data ?? []),
      })),
    [grades.data, levels.data],
  )
  const sectionOptions = (sections.data ?? []).filter(
    (section) =>
      section.grado_id === gradeId &&
      section.anio_escolar_id === enrollment.anio_escolar_id,
  )

  const submit = form.handleSubmit(async (values) => {
    if (!window.confirm(t.confirmSectionChange)) return
    setApiSectionError('')
    try {
      await mutations.changeSection.mutateAsync({
        grado_id: Number(values.grado_id),
        seccion_id: Number(values.seccion_id),
        motivo: values.motivo.trim(),
        fecha: values.fecha,
        ...(values.autorizar_exceso
          ? {
              autorizar_exceso: true,
              motivo_exceso: values.motivo_exceso.trim(),
            }
          : {}),
      })
      toast.success(t.sectionUpdated)
      onDone()
    } catch (error) {
      const sectionMessage =
        error instanceof ApiError
          ? (error.errors.seccion_id?.[0] ?? error.message)
          : undefined
      if (sectionMessage?.toLocaleLowerCase().includes('vacante')) {
        setApiSectionError(sectionMessage)
        if (tieneAlgunRol(ENROLLMENT_EXCESS_ROLES)) {
          setAllowExcessPrompt(true)
          form.setValue('autorizar_exceso', false)
        }
      }
      applyServerErrors(form.setError, error, [
        'grado_id',
        'seccion_id',
        'motivo',
        'fecha',
        'motivo_exceso',
      ])
      form.setError('root.server', {
        message:
          error instanceof ApiError && error.status === 403
            ? t.serverForbidden
            : (sectionMessage ??
              (error instanceof Error ? error.message : t.enrollmentError)),
      })
    }
  })

  return (
    <form
      className="space-y-4 rounded-xl border bg-white p-4"
      aria-label={t.changeSection}
      noValidate
      onSubmit={submit}
    >
      <h2 className="font-semibold">{t.changeSection}</h2>
      <Field
        label={t.grade}
        htmlFor="new-grade"
        error={form.formState.errors.grado_id?.message}
      >
        <Select
          id="new-grade"
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
        htmlFor="new-section"
        error={form.formState.errors.seccion_id?.message}
      >
        <Select
          id="new-section"
          disabled={!gradeId}
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
        label={t.reason}
        htmlFor="section-reason"
        error={form.formState.errors.motivo?.message}
      >
        <Textarea id="section-reason" {...form.register('motivo')} />
      </Field>
      <Field
        label={t.enrollmentDate}
        htmlFor="section-date"
        error={form.formState.errors.fecha?.message}
      >
        <Input
          id="section-date"
          type="date"
          max={dateInputToday()}
          {...form.register('fecha')}
        />
      </Field>
      {allowExcessPrompt ? (
        <div className="space-y-3 rounded-md border p-3" role="group">
          <p role="alert" className="text-sm text-destructive">
            {apiSectionError}
          </p>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" {...form.register('autorizar_exceso')} />
            {t.authorizeExcess}
          </label>
          {form.watch('autorizar_exceso') ? (
            <Field
              label={t.excessReason}
              htmlFor="section-excess-reason"
              error={form.formState.errors.motivo_exceso?.message}
            >
              <Textarea
                id="section-excess-reason"
                {...form.register('motivo_exceso')}
              />
            </Field>
          ) : null}
        </div>
      ) : null}
      {form.formState.errors.root?.server?.message ? (
        <p role="alert" className="text-sm text-destructive">
          {form.formState.errors.root.server.message}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? texts.form.saving : t.saveSection}
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
