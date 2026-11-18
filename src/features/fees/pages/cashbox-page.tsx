import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Can } from '../../../shared/ui/can'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { PageFrame } from '../../../shared/ui/page-frame'
import { StatusState } from '../../../shared/ui/status-state'
import { Textarea } from '../../../shared/ui/textarea'
import { formatSoles } from '../../../shared/utils/format'
import { usePaymentUser } from '../../payments/hooks/use-payments'
import { useIdempotencyKey } from '../../payments/hooks/use-idempotency-key'
import { todayInPeru } from '../../payments/schemas'
import { CASH_CLOSE_ROLES } from '../roles'
import {
  cashClosureFormSchema,
  type CashClosure,
  type CashClosureFormValues,
} from '../schemas'
import { useCashSummary, useCloseCashBox } from '../hooks/use-fees'

export default function CashboxPage() {
  const [confirming, setConfirming] = useState(false)
  const [closed, setClosed] = useState<CashClosure>()
  const [alreadyClosed, setAlreadyClosed] = useState(false)
  const form = useForm<CashClosureFormValues>({
    resolver: zodResolver(cashClosureFormSchema),
    defaultValues: { fecha: todayInPeru(), observacion: '' },
  })
  const date = form.watch('fecha')
  const observation = form.watch('observacion')
  const closer = usePaymentUser(closed?.usuario_id)
  const summary = useCashSummary(date)
  const close = useCloseCashBox(date)
  const fingerprint = JSON.stringify({ date, observation })
  const { key, markFailed, markSucceeded } = useIdempotencyKey(fingerprint)

  useEffect(() => {
    setClosed(undefined)
    setAlreadyClosed(false)
    setConfirming(false)
    form.reset({ fecha: date, observacion: '' })
  }, [date, form])

  const submit = form.handleSubmit(() => {
    setConfirming(true)
  })

  const confirmClose = async () => {
    try {
      if (!key) return
      const result = await close.mutateAsync({
        observacion: form.getValues('observacion'),
        key,
      })
      markSucceeded()
      setClosed(result)
      setConfirming(false)
      toast.success(texts.form.saved)
    } catch (error) {
      markFailed(fingerprint)
      setConfirming(false)
      if (error instanceof ApiError && error.status === 409) {
        setAlreadyClosed(true)
        form.setError('root.server', {
          message: texts.payments.fees.cashAlreadyClosed,
        })
      } else if (error instanceof ApiError && error.status === 403) {
        form.setError('root.server', { message: texts.errors.forbidden })
      } else if (
        !applyServerErrors(form.setError, error, ['fecha', 'observacion'])
      ) {
        form.setError('root.server', {
          message:
            error instanceof Error ? error.message : texts.form.serverFallback,
        })
      }
    }
  }

  const dateIsValid = date !== '' && date <= todayInPeru()
  const forbidden =
    summary.error instanceof ApiError && summary.error.status === 403
  const summaryError = forbidden
    ? new Error(texts.payments.errors.forbidden)
    : summary.error

  return (
    <PageFrame
      eyebrow={texts.navigation.cashbox}
      title={texts.payments.fees.cashTitle}
      description={texts.payments.fees.cashDescription}
    >
      <div className="mb-5 max-w-xs">
        <Field
          label={texts.payments.fees.cashDate}
          htmlFor="cashbox-date"
          error={form.formState.errors.fecha?.message}
        >
          <Input
            id="cashbox-date"
            type="date"
            max={todayInPeru()}
            disabled={confirming || close.isPending}
            {...form.register('fecha')}
          />
        </Field>
        {!dateIsValid && !form.formState.errors.fecha ? (
          <p className="mt-1 text-sm text-destructive" role="alert">
            {date === ''
              ? texts.payments.fees.validation.dateRequired
              : texts.payments.fees.validation.dateFuture}
          </p>
        ) : null}
      </div>

      <p className="mb-5 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
        {texts.payments.fees.cashClosureStatusUnavailable}
      </p>

      {summary.isPending ? (
        <StatusState state="loading" />
      ) : summaryError ? (
        <StatusState
          state="error"
          message={summaryError.message}
          onRetry={() => void summary.refetch()}
        />
      ) : summary.data ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{texts.payments.fees.cashTitle}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SummaryField
                label={texts.payments.fees.cashTotal}
                value={formatSoles(summary.data.total)}
              />
              <SummaryField
                label={texts.payments.fees.cashPaymentCount}
                value={String(summary.data.cantidad_pagos)}
              />
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <SummaryTable
              title={texts.payments.fees.byUser}
              headers={[
                texts.auth.userFallback,
                texts.payments.fees.count,
                texts.payments.fees.cashTotal,
              ]}
              rows={summary.data.por_usuario.map((row) => [
                row.usuario,
                String(row.cantidad),
                formatSoles(row.total),
              ])}
            />
            <SummaryTable
              title={texts.payments.fees.byMethod}
              headers={[
                texts.payments.method,
                texts.payments.fees.count,
                texts.payments.fees.cashTotal,
              ]}
              rows={summary.data.por_medio.map((row) => [
                texts.payments.fees.mediumLabels[row.medio] ?? row.medio,
                String(row.cantidad),
                formatSoles(row.total),
              ])}
            />
          </div>
        </>
      ) : null}

      <Can permiso="caja.cerrar" rol={CASH_CLOSE_ROLES}>
        <Card className="mt-6 max-w-xl">
          <CardHeader>
            <CardTitle>{texts.payments.fees.closeCashbox}</CardTitle>
          </CardHeader>
          <CardContent>
            {closed ? (
              <div role="status" className="space-y-2 text-sm">
                <p>
                  {texts.payments.fees.cashClosedBy}:{' '}
                  {closer.data
                    ? `${closer.data.nombre} ${closer.data.apellido}`
                    : texts.payments.userById(closed.usuario_id)}
                </p>
                <p>
                  {texts.payments.fees.cashTotal}: {formatSoles(closed.total)}
                </p>
              </div>
            ) : alreadyClosed ? (
              <p role="status" className="text-sm">
                {texts.payments.fees.cashAlreadyClosed}
              </p>
            ) : confirming ? (
              <div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="cashbox-confirm-title"
                className="space-y-4"
              >
                <h3 id="cashbox-confirm-title" className="font-semibold">
                  {texts.payments.fees.confirmCashClosure}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {texts.payments.fees.cashClosureConfirmation}
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    disabled={close.isPending || !key}
                    onClick={() => void confirmClose()}
                  >
                    {close.isPending
                      ? texts.payments.fees.closingCashbox
                      : texts.payments.fees.confirmCashClosure}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={close.isPending}
                    onClick={() => setConfirming(false)}
                  >
                    {texts.form.cancel}
                  </Button>
                </div>
              </div>
            ) : (
              <form className="space-y-4" onSubmit={submit}>
                <Field
                  label={texts.payments.fees.cashObservation}
                  htmlFor="cashbox-observation"
                  error={form.formState.errors.observacion?.message}
                >
                  <Textarea
                    id="cashbox-observation"
                    maxLength={1000}
                    {...form.register('observacion')}
                  />
                </Field>
                {form.formState.errors.root?.server?.message ? (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.root.server.message}
                  </p>
                ) : null}
                <Button
                  type="submit"
                  disabled={
                    !dateIsValid ||
                    !summary.data ||
                    summary.isFetching ||
                    close.isPending ||
                    !key
                  }
                >
                  {texts.payments.fees.closeCashbox}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </Can>
    </PageFrame>
  )
}

function SummaryField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  )
}

function SummaryTable({
  title,
  headers,
  rows,
}: {
  title: string
  headers: string[]
  rows: string[][]
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b text-xs uppercase text-muted-foreground">
                <tr>
                  {headers.map((header) => (
                    <th key={header} scope="col" className="px-3 py-2">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((row, index) => (
                  <tr key={`${row[0]}-${index}`}>
                    {row.map((cell, cellIndex) => (
                      <td key={`${cellIndex}-${cell}`} className="px-3 py-2">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {texts.states.noInformation}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
