import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { ApiError } from '../../../shared/api/errors'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { DataTable, type Column } from '../../../shared/ui/data-table'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { Textarea } from '../../../shared/ui/textarea'
import { formatDate, formatSoles } from '../../../shared/utils/format'
import { todayInPeru } from '../../payments/schemas'
import {
  collectionFormSchema,
  type Collection,
  type CollectionFormValues,
} from '../schemas'
import { useCollectionHistory, useCreateCollection } from '../hooks/use-debts'

const collectionColumns: Column<Collection>[] = [
  {
    id: 'date',
    header: texts.debts.collection.date,
    cell: (item) => formatDate(item.fecha),
  },
  {
    id: 'user',
    header: texts.debts.collection.user,
    cell: (item) => item.usuario,
  },
  {
    id: 'method',
    header: texts.debts.collection.method,
    cell: (item) =>
      texts.debts.collection.methodLabels[item.medio_contacto] ??
      item.medio_contacto,
  },
  {
    id: 'result',
    header: texts.debts.collection.result,
    cell: (item) => item.resultado,
  },
  {
    id: 'commitment',
    header: texts.debts.collection.commitment,
    cell: (item) =>
      item.compromiso_pago_fecha
        ? `${formatDate(item.compromiso_pago_fecha)} · ${item.compromiso_monto === null ? texts.debts.collection.noAmount : formatSoles(item.compromiso_monto)}`
        : texts.debts.collection.noCommitment,
  },
]

const FIELDS = [
  'fecha',
  'medio_contacto',
  'resultado',
  'compromiso_pago_fecha',
  'compromiso_monto',
  'observacion',
] as const

export function CollectionManagementPanel({
  studentId,
}: {
  studentId: number
}) {
  const [page, setPage] = useState(1)
  const history = useCollectionHistory(studentId, page)
  const create = useCreateCollection(studentId)
  const form = useForm<CollectionFormValues>({
    resolver: zodResolver(collectionFormSchema),
    defaultValues: {
      fecha: todayInPeru(),
      medio_contacto: 'llamada',
      resultado: '',
      compromiso_pago_fecha: '',
      compromiso_monto: '',
      observacion: '',
    },
  })

  async function submit(values: CollectionFormValues) {
    form.clearErrors('root.server')
    try {
      await create.mutateAsync(values)
      form.reset({
        fecha: todayInPeru(),
        medio_contacto: 'llamada',
        resultado: '',
        compromiso_pago_fecha: '',
        compromiso_monto: '',
        observacion: '',
      })
    } catch (error) {
      const applied = applyServerErrors(form.setError, error, FIELDS)
      if (error instanceof ApiError && error.status === 403) {
        form.setError('root.server', { message: texts.errors.forbidden })
      } else if (!applied) {
        form.setError('root.server', {
          message:
            error instanceof Error
              ? error.message
              : texts.debts.collection.submitError,
        })
      }
    }
  }

  return (
    <section id="gestiones-cobranza" className="scroll-mt-20 space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>{texts.debts.collection.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {history.isPending ? (
            <p role="status">{texts.loading}</p>
          ) : history.isError ? (
            <p role="alert">{history.error.message}</p>
          ) : (
            <DataTable
              caption={texts.debts.collection.history}
              columns={collectionColumns}
              rows={history.data.items}
              getRowId={(item) => item.id}
              pagination={history.data.pagination}
              onPageChange={setPage}
              emptyTitle={texts.debts.collection.empty}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{texts.debts.collection.registerTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 sm:grid-cols-2"
            onSubmit={form.handleSubmit(submit)}
          >
            <Field
              label={texts.debts.collection.date}
              htmlFor="collection-date"
              error={form.formState.errors.fecha?.message}
            >
              <Input
                id="collection-date"
                type="date"
                max={todayInPeru()}
                aria-invalid={Boolean(form.formState.errors.fecha)}
                {...form.register('fecha')}
              />
            </Field>
            <Field
              label={texts.debts.collection.method}
              htmlFor="collection-method"
              error={form.formState.errors.medio_contacto?.message}
            >
              <Select
                id="collection-method"
                aria-invalid={Boolean(form.formState.errors.medio_contacto)}
                {...form.register('medio_contacto')}
              >
                {Object.entries(texts.debts.collection.methodLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <Field
              label={texts.debts.collection.result}
              htmlFor="collection-result"
              error={form.formState.errors.resultado?.message}
            >
              <Input
                id="collection-result"
                maxLength={100}
                aria-invalid={Boolean(form.formState.errors.resultado)}
                {...form.register('resultado')}
              />
            </Field>
            <Field
              label={texts.debts.collection.commitmentDate}
              htmlFor="collection-commitment-date"
              error={form.formState.errors.compromiso_pago_fecha?.message}
            >
              <Input
                id="collection-commitment-date"
                type="date"
                aria-invalid={Boolean(
                  form.formState.errors.compromiso_pago_fecha,
                )}
                {...form.register('compromiso_pago_fecha')}
              />
            </Field>
            <Field
              label={texts.debts.collection.commitmentAmount}
              htmlFor="collection-commitment-amount"
              error={form.formState.errors.compromiso_monto?.message}
            >
              <Input
                id="collection-commitment-amount"
                type="number"
                min="0.01"
                step="0.01"
                inputMode="decimal"
                aria-invalid={Boolean(form.formState.errors.compromiso_monto)}
                {...form.register('compromiso_monto')}
              />
            </Field>
            <Field
              label={texts.debts.collection.observation}
              htmlFor="collection-observation"
              error={form.formState.errors.observacion?.message}
            >
              <Textarea
                id="collection-observation"
                maxLength={2000}
                className="min-h-24"
                aria-invalid={Boolean(form.formState.errors.observacion)}
                {...form.register('observacion')}
              />
            </Field>
            {form.formState.errors.root?.server ? (
              <p
                className="text-sm text-destructive sm:col-span-2"
                role="alert"
              >
                {form.formState.errors.root.server.message}
              </p>
            ) : null}
            <div className="sm:col-span-2">
              <Button type="submit" disabled={create.isPending}>
                {create.isPending
                  ? texts.debts.collection.saving
                  : texts.debts.collection.save}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </section>
  )
}
