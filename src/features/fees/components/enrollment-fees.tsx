import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { applyServerErrors } from '../../../shared/api/form-errors'
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
import { Select } from '../../../shared/ui/select'
import { StatusState } from '../../../shared/ui/status-state'
import { Textarea } from '../../../shared/ui/textarea'
import { formatDate, formatSoles } from '../../../shared/utils/format'
import { PaymentStatusBadge } from '../../payments/components/payment-status-badge'
import { useIdempotencyKey } from '../../payments/hooks/use-idempotency-key'
import type { Quota } from '../../payments/schemas'
import {
  cancelDiscountSchema,
  discountFormSchema,
  type Discount,
  type DiscountFormValues,
} from '../schemas'
import { DISCOUNT_APPROVE_ROLES } from '../roles'
import {
  useCancelDiscount,
  useCreateEnrollmentDiscounts,
  useCreateQuotaDiscount,
  useEnrollmentQuotas,
  useGenerateEnrollmentQuotas,
} from '../hooks/use-fees'

type CreatedDiscountHandler = (discounts: Discount[]) => void

export function EnrollmentFees({ enrollmentId }: { enrollmentId: number }) {
  const quotas = useEnrollmentQuotas(enrollmentId)
  const generate = useGenerateEnrollmentQuotas(enrollmentId)
  const createForEnrollment = useCreateEnrollmentDiscounts(enrollmentId)
  const [createdDiscounts, setCreatedDiscounts] = useState<Discount[]>([])
  const [generationError, setGenerationError] = useState('')
  const [generationCompleted, setGenerationCompleted] = useState(false)
  const {
    key: generationKey,
    markFailed: markGenerationFailed,
    markSucceeded: markGenerationSucceeded,
  } = useIdempotencyKey(String(enrollmentId))

  const setDiscounts: CreatedDiscountHandler = (items) =>
    setCreatedDiscounts((current) => {
      const byId = new Map(current.map((discount) => [discount.id, discount]))
      for (const discount of items) byId.set(discount.id, discount)
      return [...byId.values()]
    })

  const generateQuotas = async () => {
    if (!generationKey) return
    try {
      await generate.mutateAsync({ key: generationKey })
      markGenerationSucceeded()
      setGenerationCompleted(true)
      setGenerationError('')
      toast.success(texts.form.saved)
    } catch (error) {
      markGenerationFailed(String(enrollmentId))
      setGenerationError(
        error instanceof ApiError && error.status === 403
          ? texts.errors.forbidden
          : error instanceof Error
            ? error.message
            : texts.form.serverFallback,
      )
    }
  }

  const columns: Column<Quota>[] = [
    {
      id: 'description',
      header: texts.payments.quota,
      cell: (quota) => quota.descripcion,
    },
    {
      id: 'due',
      header: texts.payments.dueDate,
      cell: (quota) => formatDate(quota.vencimiento),
    },
    {
      id: 'status',
      header: texts.payments.status,
      cell: (quota) => <PaymentStatusBadge status={quota.estado} />,
    },
    {
      id: 'balance',
      header: texts.payments.balance,
      cell: (quota) => formatSoles(quota.saldo),
    },
    {
      id: 'discounts',
      header: texts.payments.fees.quotaDiscounts,
      cell: (quota) => formatSoles(quota.total_descuentos),
    },
    {
      id: 'actions',
      header: texts.payments.fees.actions,
      cell: (quota) => (
        <QuotaDiscountControl
          quotaId={quota.id}
          onCreated={(discount) => setDiscounts([discount])}
        />
      ),
    },
  ]

  return (
    <div className="mt-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle>{texts.payments.fees.quotasTitle}</CardTitle>
            {quotas.data?.items.length === 0 ? (
              <Can
                permiso="pagos.registrar"
                rol={['director', 'administrador', 'tesoreria']}
              >
                <Button
                  type="button"
                  disabled={
                    generate.isPending || generationCompleted || !generationKey
                  }
                  onClick={() => void generateQuotas()}
                >
                  {generate.isPending
                    ? texts.payments.fees.generatingQuotas
                    : texts.payments.fees.generateQuotas}
                </Button>
              </Can>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {quotas.isPending ? (
            <StatusState state="loading" />
          ) : quotas.isError ? (
            <StatusState
              state="error"
              message={
                quotas.error instanceof ApiError && quotas.error.status === 403
                  ? texts.payments.errors.forbidden
                  : quotas.error.message
              }
              onRetry={() => void quotas.refetch()}
            />
          ) : (
            <>
              {quotas.data.items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {texts.payments.fees.noQuotas}
                </p>
              ) : null}
              {quotas.data.items.length === 0 ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950">
                  {texts.payments.fees.noTariffForGrade}{' '}
                  <Link
                    className="font-medium underline"
                    to="/configuracion/tarifas"
                  >
                    {texts.payments.fees.tariffLink}
                  </Link>
                </p>
              ) : (
                <DataTable
                  caption={texts.payments.fees.quotasTitle}
                  columns={columns}
                  rows={quotas.data.items}
                  getRowId={(quota) => quota.id}
                />
              )}
            </>
          )}
          {generationError ? (
            <div className="space-y-2" role="alert">
              <p className="text-sm text-destructive">{generationError}</p>
              {quotas.data?.items.length === 0 ? (
                <Link
                  className="text-sm font-medium underline"
                  to="/configuracion/tarifas"
                >
                  {texts.payments.fees.tariffLink}
                </Link>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Can permiso="descuentos.aprobar" rol={DISCOUNT_APPROVE_ROLES}>
        <Card>
          <CardHeader>
            <CardTitle>{texts.payments.fees.discountsTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="text-sm text-muted-foreground">
              {texts.payments.fees.discountListUnavailable}
            </p>
            <DiscountEditor
              label={texts.payments.fees.discountForEnrollment}
              save={async (values, key) => {
                const items = await createForEnrollment.mutateAsync({
                  values,
                  key,
                })
                setDiscounts(items)
                return items
              }}
            />
            {createdDiscounts.length ? (
              <DiscountsTable
                discounts={createdDiscounts}
                onUpdated={(discount) => setDiscounts([discount])}
              />
            ) : null}
          </CardContent>
        </Card>
      </Can>
    </div>
  )
}

function QuotaDiscountControl({
  quotaId,
  onCreated,
}: {
  quotaId: number
  onCreated: (discount: Discount) => void
}) {
  const [open, setOpen] = useState(false)
  const create = useCreateQuotaDiscount(quotaId)

  return (
    <Can permiso="descuentos.aprobar" rol={DISCOUNT_APPROVE_ROLES}>
      {open ? (
        <DiscountEditor
          label={texts.payments.fees.discountForQuota}
          save={async (values, key) => {
            const discount = await create.mutateAsync({ values, key })
            onCreated(discount)
            return [discount]
          }}
          onCancel={() => setOpen(false)}
        />
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setOpen(true)}
        >
          {texts.payments.fees.discountForQuota}
        </Button>
      )}
    </Can>
  )
}

function DiscountEditor({
  label,
  save,
  onCancel,
}: {
  label: string
  save: (values: DiscountFormValues, key: string) => Promise<Discount[]>
  onCancel?: () => void
}) {
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      tipo: 'descuento',
      modo: 'monto',
      valor: '',
      motivo: '',
    },
  })
  const currentValues = form.watch()
  const fingerprint = JSON.stringify(currentValues)
  const { key, markFailed, markSucceeded } = useIdempotencyKey(fingerprint)
  const idPrefix = label.toLowerCase().replace(/[^a-z0-9]+/g, '-')
  const [confirming, setConfirming] = useState(false)
  const [saving, setSaving] = useState(false)

  const submit = form.handleSubmit(() => setConfirming(true))
  const confirm = async () => {
    if (!key) return
    setSaving(true)
    try {
      await save(form.getValues(), key)
      markSucceeded()
      form.reset()
      setConfirming(false)
      toast.success(texts.form.saved)
    } catch (error) {
      markFailed(fingerprint)
      setConfirming(false)
      if (
        !applyServerErrors(form.setError, error, [
          'tipo',
          'modo',
          'valor',
          'motivo',
        ])
      ) {
        form.setError('root.server', {
          message:
            error instanceof ApiError && error.status === 403
              ? texts.errors.forbidden
              : error instanceof Error
                ? error.message
                : texts.form.serverFallback,
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-md border p-4">
      <h3 className="mb-4 font-medium">{label}</h3>
      <form className="space-y-4" onSubmit={submit}>
        <fieldset
          disabled={confirming || saving}
          className="grid gap-4 sm:grid-cols-2"
        >
          <Field
            label={texts.payments.fees.discountType}
            htmlFor={`discount-type-${idPrefix}`}
            error={form.formState.errors.tipo?.message}
          >
            <Select id={`discount-type-${idPrefix}`} {...form.register('tipo')}>
              <option value="beca">{texts.payments.fees.scholarship}</option>
              <option value="descuento">{texts.payments.fees.discount}</option>
              <option value="exoneracion">
                {texts.payments.fees.exemption}
              </option>
            </Select>
          </Field>
          <Field
            label={texts.payments.fees.discountMode}
            htmlFor={`discount-mode-${idPrefix}`}
            error={form.formState.errors.modo?.message}
          >
            <Select id={`discount-mode-${idPrefix}`} {...form.register('modo')}>
              <option value="monto">
                {texts.payments.fees.discountAmountMode}
              </option>
              <option value="porcentaje">
                {texts.payments.fees.discountPercentageMode}
              </option>
            </Select>
          </Field>
          <Field
            label={texts.payments.fees.discountValue}
            htmlFor={`discount-value-${idPrefix}`}
            error={form.formState.errors.valor?.message}
          >
            <Input
              id={`discount-value-${idPrefix}`}
              inputMode="decimal"
              {...form.register('valor')}
            />
          </Field>
          <Field
            label={texts.payments.fees.discountReason}
            htmlFor={`discount-reason-${idPrefix}`}
            error={form.formState.errors.motivo?.message}
          >
            <Textarea
              id={`discount-reason-${idPrefix}`}
              maxLength={5000}
              {...form.register('motivo')}
            />
          </Field>
        </fieldset>
        {form.formState.errors.root?.server?.message ? (
          <p role="alert" className="text-sm text-destructive">
            {form.formState.errors.root.server.message}
          </p>
        ) : null}
        {!confirming ? (
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={!key}>
              {texts.payments.fees.createDiscount}
            </Button>
            {onCancel ? (
              <Button type="button" variant="outline" onClick={onCancel}>
                {texts.form.cancel}
              </Button>
            ) : null}
          </div>
        ) : (
          <div
            role="alertdialog"
            aria-modal="true"
            aria-label={texts.payments.fees.createDiscount}
            className="flex flex-wrap items-center gap-2"
          >
            <p className="w-full text-sm">
              {texts.payments.fees.discountApplicationConfirmation}
            </p>
            <Button
              type="button"
              disabled={!key || saving}
              onClick={() => void confirm()}
            >
              {saving
                ? texts.payments.fees.creatingDiscount
                : texts.payments.fees.createDiscount}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => setConfirming(false)}
            >
              {texts.form.cancel}
            </Button>
          </div>
        )}
      </form>
    </div>
  )
}

function DiscountsTable({
  discounts,
  onUpdated,
}: {
  discounts: Discount[]
  onUpdated: (discount: Discount) => void
}) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">{texts.payments.fees.discountsTable}</h3>
      <div className="overflow-x-auto rounded-xl border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/60 text-xs uppercase text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2">
                #
              </th>
              <th scope="col" className="px-3 py-2">
                {texts.payments.fees.discountType}
              </th>
              <th scope="col" className="px-3 py-2">
                {texts.payments.fees.discountValue}
              </th>
              <th scope="col" className="px-3 py-2">
                {texts.payments.fees.discountCalculatedAmount}
              </th>
              <th scope="col" className="px-3 py-2">
                {texts.payments.fees.discountReason}
              </th>
              <th scope="col" className="px-3 py-2">
                {texts.payments.fees.actions}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {discounts.map((discount) => (
              <tr key={discount.id}>
                <td className="px-3 py-2">{discount.id}</td>
                <td className="px-3 py-2">{discount.tipo}</td>
                <td className="px-3 py-2">
                  {discount.modo === 'porcentaje'
                    ? `${discount.valor}%`
                    : formatSoles(discount.valor)}
                </td>
                <td className="px-3 py-2">
                  {formatSoles(discount.monto_calculado)}
                </td>
                <td className="px-3 py-2">{discount.motivo}</td>
                <td className="px-3 py-2">
                  {discount.anulada_en ? (
                    <Badge tone="neutral">
                      {texts.payments.statusLabels.anulado}
                    </Badge>
                  ) : (
                    <CancelDiscountControl
                      discount={discount}
                      onUpdated={onUpdated}
                    />
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function CancelDiscountControl({
  discount,
  onUpdated,
}: {
  discount: Discount
  onUpdated: (discount: Discount) => void
}) {
  const form = useForm<{ motivo: string }>({
    resolver: zodResolver(cancelDiscountSchema),
    defaultValues: { motivo: '' },
  })
  const reason = form.watch('motivo')
  const fingerprint = reason.trim()
  const { key, markFailed, markSucceeded } = useIdempotencyKey(fingerprint)
  const [confirming, setConfirming] = useState(false)
  const cancel = useCancelDiscount(discount.id)

  const submit = form.handleSubmit(() => setConfirming(true))
  const confirm = async () => {
    if (!key) return
    try {
      const updated = await cancel.mutateAsync({
        values: form.getValues(),
        key,
      })
      markSucceeded()
      onUpdated(updated)
      setConfirming(false)
      toast.success(texts.form.saved)
    } catch (error) {
      markFailed(fingerprint)
      setConfirming(false)
      form.setError('root.server', {
        message:
          error instanceof ApiError && error.status === 403
            ? texts.errors.forbidden
            : error instanceof Error
              ? error.message
              : texts.form.serverFallback,
      })
    }
  }

  return (
    <form className="min-w-52 space-y-2" onSubmit={submit}>
      <Field
        label={texts.payments.fees.cancellationReason}
        htmlFor={`discount-cancel-${discount.id}`}
        error={form.formState.errors.motivo?.message}
      >
        <Input
          id={`discount-cancel-${discount.id}`}
          maxLength={5000}
          disabled={confirming || cancel.isPending}
          {...form.register('motivo')}
        />
      </Field>
      {form.formState.errors.root?.server?.message ? (
        <p role="alert" className="text-xs text-destructive">
          {form.formState.errors.root.server.message}
        </p>
      ) : null}
      {!confirming ? (
        <Button type="submit" size="sm" variant="destructive" disabled={!key}>
          {texts.payments.fees.cancelDiscount}
        </Button>
      ) : (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-label={texts.payments.fees.cancelDiscountConfirm}
          className="space-y-2"
        >
          <p className="text-xs">{texts.payments.fees.cancelDiscountConfirm}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={cancel.isPending}
              onClick={() => void confirm()}
            >
              {texts.payments.fees.confirmDiscountCancellation}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={cancel.isPending}
              onClick={() => setConfirming(false)}
            >
              {texts.form.cancel}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
