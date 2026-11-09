import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import {
  useForm,
  type FieldErrors,
  type UseFormRegister,
} from 'react-hook-form'
import { toast } from 'sonner'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { StatusState } from '../../../shared/ui/status-state'
import {
  guardianLinkSchema,
  guardianNewSchema,
  type GuardianLinkValues,
  type GuardianNewValues,
} from '../form-schemas'
import {
  useCreateGuardian,
  useGuardianSearch,
  useLinkGuardian,
} from '../hooks/use-student-mutations'

const t = texts.studentsForm
const RELATIONSHIP_LIST_ID = 'guardian-relationship-options'

type SharedFieldsProps = {
  register: UseFormRegister<GuardianLinkValues>
  errors: FieldErrors<GuardianLinkValues>
  idPrefix: string
}

/** Parentesco, teléfono, correo y responsable de pago: lo que se pide al vincular un apoderado. */
function RelationshipFields({ register, errors, idPrefix }: SharedFieldsProps) {
  return (
    <>
      <Field
        label={t.guardianRelationship}
        htmlFor={`${idPrefix}-parentesco`}
        error={errors.parentesco?.message}
      >
        <Input
          id={`${idPrefix}-parentesco`}
          list={RELATIONSHIP_LIST_ID}
          autoComplete="off"
          aria-invalid={Boolean(errors.parentesco)}
          {...register('parentesco')}
        />
        <datalist id={RELATIONSHIP_LIST_ID}>
          {t.relationshipSuggestions.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.guardianPhone}
          htmlFor={`${idPrefix}-telefono`}
          error={errors.telefono?.message}
        >
          <Input
            id={`${idPrefix}-telefono`}
            type="tel"
            autoComplete="off"
            aria-invalid={Boolean(errors.telefono)}
            {...register('telefono')}
          />
        </Field>
        <Field
          label={t.guardianEmail}
          htmlFor={`${idPrefix}-email`}
          error={errors.email?.message}
        >
          <Input
            id={`${idPrefix}-email`}
            type="email"
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            {...register('email')}
          />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          className="size-4"
          {...register('responsable_pago')}
        />
        {t.guardianPaymentOwner}
      </label>
    </>
  )
}

type FormProps = { studentId: number; onDone: () => void }

export function NewGuardianForm({ studentId, onDone }: FormProps) {
  const create = useCreateGuardian(studentId)
  const form = useForm<GuardianNewValues>({
    resolver: zodResolver(guardianNewSchema),
    defaultValues: {
      nombre: '',
      apellido: '',
      parentesco: '',
      telefono: '',
      email: '',
      responsable_pago: false,
    },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync(values)
      toast.success(t.guardianCreated)
      onDone()
    } catch (error) {
      applyServerErrors(form.setError, error, [
        'nombre',
        'apellido',
        'parentesco',
        'telefono',
        'email',
        'responsable_pago',
      ])
      toast.error(
        error instanceof Error ? error.message : texts.form.serverFallback,
      )
    }
  })

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={t.guardianAdd}
      className="space-y-4 rounded-xl border bg-white p-4"
    >
      <h3 className="text-sm font-semibold">{t.guardianAdd}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={t.guardianFirstName}
          htmlFor="guardian-nombre"
          error={errors.nombre?.message}
        >
          <Input
            id="guardian-nombre"
            autoComplete="off"
            aria-invalid={Boolean(errors.nombre)}
            {...form.register('nombre')}
          />
        </Field>
        <Field
          label={t.guardianLastName}
          htmlFor="guardian-apellido"
          error={errors.apellido?.message}
        >
          <Input
            id="guardian-apellido"
            autoComplete="off"
            aria-invalid={Boolean(errors.apellido)}
            {...form.register('apellido')}
          />
        </Field>
      </div>
      {/* Los datos del apoderado nuevo incluyen todos los campos del vínculo, por eso el cambio de tipo es seguro. */}
      <RelationshipFields
        register={
          form.register as unknown as UseFormRegister<GuardianLinkValues>
        }
        errors={errors as FieldErrors<GuardianLinkValues>}
        idPrefix="guardian-new"
      />
      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? texts.form.saving : t.guardianSubmitNew}
        </Button>
        <Button
          type="button"
          size="sm"
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

export function LinkGuardianForm({ studentId, onDone }: FormProps) {
  const link = useLinkGuardian(studentId)
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 400)
  const results = useGuardianSearch(debouncedSearch)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectionError, setSelectionError] = useState<string | null>(null)

  const form = useForm<GuardianLinkValues>({
    resolver: zodResolver(guardianLinkSchema),
    defaultValues: {
      parentesco: '',
      telefono: '',
      email: '',
      responsable_pago: false,
    },
  })
  const { errors, isSubmitting } = form.formState

  const submit = form.handleSubmit(async (values) => {
    if (selectedId === null) {
      setSelectionError(t.guardianChoose)
      return
    }
    try {
      await link.mutateAsync({ guardianId: selectedId, values })
      toast.success(t.guardianLinked)
      onDone()
    } catch (error) {
      applyServerErrors(form.setError, error, [
        'parentesco',
        'telefono',
        'email',
        'responsable_pago',
      ])
      toast.error(
        error instanceof Error ? error.message : texts.form.serverFallback,
      )
    }
  })

  const searchReady = debouncedSearch.trim().length >= 2

  return (
    <form
      onSubmit={submit}
      noValidate
      aria-label={t.guardianLink}
      className="space-y-4 rounded-xl border bg-white p-4"
    >
      <h3 className="text-sm font-semibold">{t.guardianLink}</h3>

      <Field
        label={t.guardianSearch}
        htmlFor="guardian-search"
        help={t.guardianSearchHint}
      >
        <Input
          id="guardian-search"
          type="search"
          autoComplete="off"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setSelectedId(null)
            setSelectionError(null)
          }}
        />
      </Field>

      {searchReady ? (
        results.isPending ? (
          <StatusState state="loading" />
        ) : results.isError ? (
          <StatusState
            state="error"
            message={results.error.message}
            onRetry={() => void results.refetch()}
          />
        ) : results.data.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t.guardianSearchEmpty}
          </p>
        ) : (
          <fieldset className="space-y-1">
            <legend className="sr-only">{t.guardianSearch}</legend>
            {results.data.items.map((guardian) => (
              <label
                key={guardian.id}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted"
              >
                <input
                  type="radio"
                  name="guardian"
                  checked={selectedId === guardian.id}
                  onChange={() => {
                    setSelectedId(guardian.id)
                    setSelectionError(null)
                  }}
                />
                {guardian.apellido}, {guardian.nombre}
              </label>
            ))}
          </fieldset>
        )
      ) : null}

      {selectionError ? (
        <p className="text-sm text-destructive" role="alert">
          {selectionError}
        </p>
      ) : null}

      <RelationshipFields
        register={form.register}
        errors={errors}
        idPrefix="guardian-link"
      />

      <div className="flex flex-wrap gap-3">
        <Button type="submit" size="sm" disabled={isSubmitting}>
          {isSubmitting ? texts.form.saving : t.guardianSubmitLink}
        </Button>
        <Button
          type="button"
          size="sm"
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
