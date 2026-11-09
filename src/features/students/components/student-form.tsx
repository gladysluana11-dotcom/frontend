import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import {
  studentFormFields,
  studentFormSchema,
  type StudentFormValues,
} from '../form-schemas'

type StudentFormProps = {
  initialValues: StudentFormValues
  submitLabel: string
  onSubmit: (values: StudentFormValues) => Promise<void>
  onCancel: () => void
}

function todayAsText(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function StudentForm({
  initialValues,
  submitLabel,
  onSubmit,
  onCancel,
}: StudentFormProps) {
  const t = texts.studentsForm
  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentFormSchema),
    defaultValues: initialValues,
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    try {
      await onSubmit(values)
    } catch (error) {
      applyServerErrors(form.setError, error, studentFormFields)
      toast.error(
        error instanceof Error ? error.message : texts.form.serverFallback,
      )
    }
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      className="space-y-5"
      aria-label={t.newTitle}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.firstName}
          htmlFor="nombre"
          error={errors.nombre?.message}
        >
          <Input
            id="nombre"
            autoComplete="off"
            aria-invalid={Boolean(errors.nombre)}
            {...form.register('nombre')}
          />
        </Field>
        <Field
          label={t.lastName}
          htmlFor="apellido"
          error={errors.apellido?.message}
        >
          <Input
            id="apellido"
            autoComplete="off"
            aria-invalid={Boolean(errors.apellido)}
            {...form.register('apellido')}
          />
        </Field>
        <Field
          label={t.documentType}
          htmlFor="tipo_documento"
          error={errors.tipo_documento?.message}
        >
          <Select id="tipo_documento" {...form.register('tipo_documento')}>
            {t.documentTypes.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={t.documentNumber}
          htmlFor="documento_identidad"
          error={errors.documento_identidad?.message}
        >
          <Input
            id="documento_identidad"
            inputMode="text"
            autoComplete="off"
            aria-invalid={Boolean(errors.documento_identidad)}
            {...form.register('documento_identidad')}
          />
        </Field>
        <Field
          label={t.birthDate}
          htmlFor="fecha_nacimiento"
          error={errors.fecha_nacimiento?.message}
        >
          <Input
            id="fecha_nacimiento"
            type="date"
            max={todayAsText()}
            aria-invalid={Boolean(errors.fecha_nacimiento)}
            {...form.register('fecha_nacimiento')}
          />
        </Field>
        <Field label={t.sex} htmlFor="sexo" error={errors.sexo?.message}>
          <Select id="sexo" {...form.register('sexo')}>
            <option value="">{t.chooseOption}</option>
            {t.sexOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field
        label={t.address}
        htmlFor="direccion"
        error={errors.direccion?.message}
      >
        <Input
          id="direccion"
          autoComplete="off"
          aria-invalid={Boolean(errors.direccion)}
          {...form.register('direccion')}
        />
      </Field>
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? texts.form.saving : submitLabel}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          {texts.form.cancel}
        </Button>
      </div>
    </form>
  )
}
