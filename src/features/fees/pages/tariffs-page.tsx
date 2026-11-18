import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useMemo, useState } from 'react'
import { useForm, type UseFormRegisterReturn } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value'
import { useTableState } from '../../../shared/hooks/use-table-state'
import { texts } from '../../../shared/texts'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import { Can } from '../../../shared/ui/can'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { DataTable, type Column } from '../../../shared/ui/data-table'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { PageFrame } from '../../../shared/ui/page-frame'
import { Select } from '../../../shared/ui/select'
import { StatusState } from '../../../shared/ui/status-state'
import { formatSoles } from '../../../shared/utils/format'
import {
  useAcademicLevels,
  useAcademicYears,
  useGrades,
  useTariffMutations,
  useTariffs,
} from '../hooks/use-fees'
import { TARIFF_MANAGE_ROLES } from '../roles'
import {
  tariffFormSchema,
  type Tariff,
  type TariffFormValues,
} from '../schemas'

const FILTER_KEYS = ['anio_escolar_id', 'grado_id'] as const
const FORM_FIELDS = [
  'anio_escolar_id',
  'grado_id',
  'monto_matricula',
  'monto_pension',
  'numero_cuotas',
  'dia_vencimiento',
  'mes_primera_pension',
]

function fieldValues(
  tariff?: Tariff,
  yearId = '',
  gradeId = '',
): TariffFormValues {
  return {
    anio_escolar_id: tariff ? String(tariff.anio_escolar_id) : yearId,
    grado_id: tariff ? String(tariff.grado_id) : gradeId,
    monto_matricula: tariff?.monto_matricula.toFixed(2) ?? '0.00',
    monto_pension: tariff?.monto_pension.toFixed(2) ?? '0.00',
    numero_cuotas: String(tariff?.numero_cuotas ?? 1),
    dia_vencimiento: String(tariff?.dia_vencimiento ?? 1),
    mes_primera_pension: String(tariff?.mes_primera_pension ?? 3),
  }
}

function gradeLabel(
  grade: {
    id: number
    nombre: string
    nivel?: string | { nombre: string } | null | undefined
  },
  levelName?: string,
): string {
  const nestedLevel =
    typeof grade.nivel === 'string' ? grade.nivel : grade.nivel?.nombre
  const level = nestedLevel ?? levelName
  return level
    ? texts.payments.fees.tariffGradeLabel(level, grade.nombre)
    : grade.nombre
}

export default function TariffsPage() {
  const table = useTableState(FILTER_KEYS)
  const { state } = table
  const search = useDebouncedValue(state.search, 350)
  const years = useAcademicYears()
  const levels = useAcademicLevels()
  const grades = useGrades()
  const tariffs = useTariffs({
    page: state.page,
    perPage: state.perPage,
    search,
    ...(Number(state.filters.anio_escolar_id) > 0
      ? { academicYearId: Number(state.filters.anio_escolar_id) }
      : {}),
    ...(Number(state.filters.grado_id) > 0
      ? { gradeId: Number(state.filters.grado_id) }
      : {}),
  })
  const mutations = useTariffMutations()
  const [editing, setEditing] = useState<Tariff | undefined>()
  const [formOpen, setFormOpen] = useState(false)
  const form = useForm<TariffFormValues>({
    resolver: zodResolver(tariffFormSchema),
    defaultValues: fieldValues(),
  })
  const formErrors = form.formState.errors
  const selectedYearId = Number(form.watch('anio_escolar_id'))
  const selectedYear = years.data?.items.find(
    (year) => year.id === selectedYearId,
  )
  const filteredYear = years.data?.items.find(
    (year) => year.id === Number(state.filters.anio_escolar_id),
  )
  const canCreateForYear = state.filters.anio_escolar_id
    ? filteredYear !== undefined && !filteredYear.cerrado
    : years.data?.items.some((year) => !year.cerrado) === true

  useEffect(() => {
    form.reset(fieldValues(editing))
  }, [editing, form])

  const levelsById = useMemo(
    () => new Map((levels.data?.items ?? []).map((level) => [level.id, level])),
    [levels.data?.items],
  )

  const openNew = () => {
    setEditing(undefined)
    form.reset(
      fieldValues(
        undefined,
        filteredYear && !filteredYear.cerrado ? String(filteredYear.id) : '',
        state.filters.grado_id ?? '',
      ),
    )
    setFormOpen(true)
  }

  const openEdit = (tariff: Tariff) => {
    setEditing(tariff)
    form.reset(fieldValues(tariff))
    setFormOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      if (editing)
        await mutations.update.mutateAsync({ id: editing.id, values })
      else await mutations.create.mutateAsync(values)
      setFormOpen(false)
      setEditing(undefined)
      toast.success(texts.form.saved)
    } catch (error) {
      if (error instanceof ApiError && error.status === 403) {
        form.setError('root.server', { message: texts.errors.forbidden })
      } else if (!applyServerErrors(form.setError, error, FORM_FIELDS)) {
        form.setError('root.server', {
          message:
            error instanceof Error ? error.message : texts.form.serverFallback,
        })
      }
    }
  })

  const columns: Column<Tariff>[] = [
    {
      id: 'year',
      header: texts.payments.fees.year,
      cell: (tariff) =>
        years.data?.items.find((year) => year.id === tariff.anio_escolar_id)
          ?.nombre ?? String(tariff.anio_escolar_id),
    },
    {
      id: 'grade',
      header: texts.payments.fees.grade,
      cell: (tariff) => {
        const grade = grades.data?.items.find(
          (item) => item.id === tariff.grado_id,
        )
        return grade
          ? gradeLabel(grade, levelsById.get(grade.nivel_id ?? -1)?.nombre)
          : (tariff.grado ?? `#${tariff.grado_id}`)
      },
    },
    {
      id: 'enrollment',
      header: texts.payments.fees.enrollmentFee,
      cell: (tariff) => formatSoles(tariff.monto_matricula),
    },
    {
      id: 'tuition',
      header: texts.payments.fees.tuitionFee,
      cell: (tariff) => formatSoles(tariff.monto_pension),
    },
    {
      id: 'installments',
      header: texts.payments.fees.installments,
      cell: (tariff) => tariff.numero_cuotas,
    },
    {
      id: 'due-day',
      header: texts.payments.fees.dueDay,
      cell: (tariff) => tariff.dia_vencimiento,
    },
    {
      id: 'first-month',
      header: texts.payments.fees.firstTuitionMonth,
      cell: (tariff) =>
        texts.payments.fees.monthNames[tariff.mes_primera_pension - 1] ??
        tariff.mes_primera_pension,
    },
    {
      id: 'actions',
      header: texts.payments.fees.actions,
      cell: (tariff) => {
        const year = years.data?.items.find(
          (item) => item.id === tariff.anio_escolar_id,
        )
        return (
          <div className="flex items-center gap-2">
            {year?.cerrado ? (
              <Badge tone="warning">{texts.payments.fees.yearClosed}</Badge>
            ) : null}
            <Can permiso="tarifas.gestionar" rol={TARIFF_MANAGE_ROLES}>
              {year && !year.cerrado ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => openEdit(tariff)}
                >
                  {texts.payments.fees.editTariff}
                </Button>
              ) : null}
            </Can>
          </div>
        )
      },
    },
  ]

  const catalogError = years.error ?? grades.error ?? levels.error
  const listError =
    tariffs.error instanceof ApiError && tariffs.error.status === 403
      ? new Error(texts.payments.errors.forbidden)
      : tariffs.error
  const saving = mutations.create.isPending || mutations.update.isPending

  return (
    <PageFrame
      eyebrow={texts.navigation.tariffs}
      title={texts.payments.fees.tariffsTitle}
      description={texts.payments.fees.tariffsDescription}
    >
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <Field label={texts.payments.fees.year} htmlFor="tariff-filter-year">
          <Select
            id="tariff-filter-year"
            value={state.filters.anio_escolar_id ?? ''}
            onChange={(event) =>
              table.setFilter('anio_escolar_id', event.target.value)
            }
          >
            <option value="">{texts.payments.fees.allYears}</option>
            {(years.data?.items ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.nombre}
                {year.cerrado ? ` · ${texts.payments.fees.yearClosed}` : ''}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={texts.payments.fees.grade} htmlFor="tariff-filter-grade">
          <Select
            id="tariff-filter-grade"
            value={state.filters.grado_id ?? ''}
            onChange={(event) =>
              table.setFilter('grado_id', event.target.value)
            }
          >
            <option value="">{texts.payments.fees.allGrades}</option>
            {(grades.data?.items ?? []).map((grade) => (
              <option key={grade.id} value={grade.id}>
                {gradeLabel(
                  grade,
                  levelsById.get(grade.nivel_id ?? -1)?.nombre,
                )}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={texts.table.search} htmlFor="tariff-search">
          <Input
            id="tariff-search"
            value={state.search}
            onChange={(event) => table.setSearch(event.target.value)}
            placeholder={texts.payments.fees.searchTariffs}
          />
        </Field>
        <Can permiso="tarifas.gestionar" rol={TARIFF_MANAGE_ROLES}>
          {canCreateForYear ? (
            <Button
              type="button"
              onClick={openNew}
              disabled={
                !years.data?.items.length ||
                !grades.data?.items.length ||
                Boolean(catalogError)
              }
            >
              {texts.payments.fees.newTariff}
            </Button>
          ) : null}
        </Can>
      </div>

      {catalogError ? (
        <StatusState
          state="error"
          message={catalogError.message}
          onRetry={() => {
            void years.refetch()
            void grades.refetch()
            void levels.refetch()
          }}
        />
      ) : null}

      {selectedYear?.cerrado ? (
        <p className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
          {texts.payments.fees.yearClosedReadOnly}
        </p>
      ) : null}

      {formOpen ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>
              {editing
                ? texts.payments.fees.editTariff
                : texts.payments.fees.newTariff}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedYear?.cerrado ? (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {texts.payments.fees.yearClosedReadOnly}
              </p>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <fieldset
                  disabled={saving}
                  className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                >
                  <Field
                    label={texts.payments.fees.year}
                    htmlFor="tariff-year"
                    error={formErrors.anio_escolar_id?.message}
                  >
                    <Select
                      id="tariff-year"
                      {...form.register('anio_escolar_id')}
                    >
                      <option value="">{texts.payments.fees.chooseYear}</option>
                      {(years.data?.items ?? []).map((year) => (
                        <option
                          key={year.id}
                          value={year.id}
                          disabled={year.cerrado}
                        >
                          {year.nombre}
                          {year.cerrado
                            ? ` · ${texts.payments.fees.yearClosed}`
                            : ''}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field
                    label={texts.payments.fees.grade}
                    htmlFor="tariff-grade"
                    error={formErrors.grado_id?.message}
                  >
                    <Select id="tariff-grade" {...form.register('grado_id')}>
                      <option value="">
                        {texts.payments.fees.chooseGrade}
                      </option>
                      {(grades.data?.items ?? []).map((grade) => (
                        <option key={grade.id} value={grade.id}>
                          {gradeLabel(
                            grade,
                            levelsById.get(grade.nivel_id ?? -1)?.nombre,
                          )}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <MoneyField
                    label={texts.payments.fees.enrollmentFee}
                    id="tariff-enrollment-amount"
                    error={formErrors.monto_matricula?.message}
                    register={form.register('monto_matricula')}
                  />
                  <MoneyField
                    label={texts.payments.fees.tuitionFee}
                    id="tariff-tuition-amount"
                    error={formErrors.monto_pension?.message}
                    register={form.register('monto_pension')}
                  />
                  <TextField
                    label={texts.payments.fees.installments}
                    id="tariff-installments"
                    error={formErrors.numero_cuotas?.message}
                    register={form.register('numero_cuotas')}
                  />
                  <TextField
                    label={texts.payments.fees.dueDay}
                    id="tariff-due-day"
                    error={formErrors.dia_vencimiento?.message}
                    register={form.register('dia_vencimiento')}
                  />
                  <Field
                    label={texts.payments.fees.firstTuitionMonth}
                    htmlFor="tariff-first-month"
                    error={formErrors.mes_primera_pension?.message}
                  >
                    <Select
                      id="tariff-first-month"
                      {...form.register('mes_primera_pension')}
                    >
                      {texts.payments.fees.monthNames.map((month, index) => (
                        <option key={month} value={index + 1}>
                          {month}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </fieldset>
                {formErrors.root?.server?.message ? (
                  <p className="text-sm text-destructive" role="alert">
                    {formErrors.root.server.message}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="submit" disabled={saving}>
                    {saving
                      ? texts.payments.fees.savingTariff
                      : texts.payments.fees.saveTariff}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={saving}
                    onClick={() => setFormOpen(false)}
                  >
                    {texts.form.cancel}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      ) : null}

      <DataTable
        caption={texts.payments.fees.tariffList}
        columns={columns}
        rows={tariffs.data?.items ?? []}
        getRowId={(tariff) => tariff.id}
        isLoading={tariffs.isPending || years.isPending || grades.isPending}
        isFetching={tariffs.isFetching}
        error={listError}
        onRetry={() => void tariffs.refetch()}
        pagination={tariffs.data?.pagination}
        onPageChange={table.setPage}
        onPerPageChange={table.setPerPage}
        emptyTitle={texts.payments.fees.noTariffs}
      />
    </PageFrame>
  )
}

function MoneyField({
  label,
  id,
  error,
  register,
}: {
  label: string
  id: string
  error?: string | undefined
  register: UseFormRegisterReturn
}) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Input id={id} inputMode="decimal" {...register} />
    </Field>
  )
}

function TextField({
  label,
  id,
  error,
  register,
}: {
  label: string
  id: string
  error?: string | undefined
  register: UseFormRegisterReturn
}) {
  return (
    <Field label={label} htmlFor={id} error={error}>
      <Input id={id} inputMode="numeric" {...register} />
    </Field>
  )
}
