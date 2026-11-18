import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useParams } from 'react-router-dom'
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
import { formatDate, formatSoles } from '../../../shared/utils/format'
import { useStudent } from '../../students/hooks/use-students'
import { PaymentStatusBadge } from '../components/payment-status-badge'
import { PAYMENT_CANCEL_ROLES, PAYMENT_VIEW_ROLES } from '../roles'
import { cancellationSchema, type CancellationValues } from '../schemas'
import {
  useCancelPayment,
  useDownloadPaymentReceipt,
  usePayment,
  usePaymentUser,
  usePaymentVoucher,
  useUploadPaymentVoucher,
} from '../hooks/use-payments'

const VOUCHER_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const VOUCHER_MAX_BYTES = 2 * 1024 * 1024

function voucherError(file: File | undefined): string | undefined {
  if (!file) return texts.payments.errors.voucherRequired
  if (!VOUCHER_TYPES.includes(file.type))
    return texts.payments.errors.voucherType
  if (file.size > VOUCHER_MAX_BYTES) return texts.payments.errors.voucherSize
  return undefined
}

export default function PaymentDetailPage() {
  const routeParams = useParams()
  const parsedId = Number(routeParams.id)
  const paymentId =
    Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined
  const payment = usePayment(paymentId)
  const student = useStudent(payment.data?.alumno_id)
  const user = usePaymentUser(payment.data?.usuario_id)
  const downloadReceipt = useDownloadPaymentReceipt()
  const [showCancellation, setShowCancellation] = useState(false)
  const [voucherFile, setVoucherFile] = useState<File>()
  const [voucherErrorMessage, setVoucherErrorMessage] = useState('')
  const [voucherUrl, setVoucherUrl] = useState<string>()
  const voucher = usePaymentVoucher(
    paymentId,
    Boolean(payment.data?.voucher_disponible),
  )
  const cancel = useCancelPayment(paymentId ?? 0)
  const uploadVoucher = useUploadPaymentVoucher(paymentId ?? 0)
  const cancelForm = useForm<CancellationValues>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: { motivo: '' },
  })

  useEffect(() => {
    if (!voucher.data) return
    const url = URL.createObjectURL(voucher.data)
    setVoucherUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [voucher.data])

  if (!paymentId) {
    return (
      <PageFrame title={texts.payments.detailTitle}>
        <StatusState
          state="empty"
          title={texts.payments.notFound}
          message={texts.payments.notFound}
        />
      </PageFrame>
    )
  }

  if (payment.isPending) {
    return (
      <PageFrame title={texts.payments.detailTitle}>
        <StatusState state="loading" />
      </PageFrame>
    )
  }

  if (payment.isError) {
    const forbidden =
      payment.error instanceof ApiError && payment.error.status === 403
    const notFound =
      payment.error instanceof ApiError && payment.error.status === 404
    return (
      <PageFrame title={texts.payments.detailTitle}>
        <StatusState
          state="error"
          {...(forbidden
            ? { title: texts.navigation.forbiddenTitle }
            : notFound
              ? { title: texts.payments.notFound }
              : {})}
          message={
            forbidden
              ? texts.payments.errors.forbidden
              : notFound
                ? texts.payments.notFound
                : payment.error.message
          }
          onRetry={() => void payment.refetch()}
        />
      </PageFrame>
    )
  }

  const data = payment.data
  const studentName = student.data
    ? `${student.data.nombre} ${student.data.apellido}`
    : student.isPending
      ? texts.loading
      : texts.payments.errors.studentName

  async function submitCancellation(values: CancellationValues) {
    try {
      await cancel.mutateAsync(values)
      setShowCancellation(false)
      cancelForm.reset()
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) {
        applyServerErrors(cancelForm.setError, error, ['motivo'])
      } else {
        cancelForm.setError('root.server', {
          message:
            error instanceof ApiError && error.status === 403
              ? texts.payments.errors.forbidden
              : error instanceof Error
                ? error.message
                : texts.payments.errors.generic,
        })
      }
    }
  }

  async function submitVoucher() {
    const message = voucherError(voucherFile)
    if (message) {
      setVoucherErrorMessage(message)
      return
    }
    setVoucherErrorMessage('')
    if (!voucherFile) return
    try {
      await uploadVoucher.mutateAsync(voucherFile)
      setVoucherFile(undefined)
    } catch (error) {
      setVoucherErrorMessage(
        error instanceof ApiError && error.status === 403
          ? texts.payments.errors.forbidden
          : error instanceof Error
            ? error.message
            : texts.payments.errors.generic,
      )
    }
  }

  return (
    <PageFrame
      eyebrow={texts.navigation.payments}
      title={`${texts.payments.detailTitle} · ${data.constancia}`}
    >
      <div className="screen-only mb-4 flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <Link to="/pagos">{texts.payments.backToPayments}</Link>
        </Button>
        <Can permiso="pagos.ver" rol={PAYMENT_VIEW_ROLES}>
          <Button asChild variant="outline">
            <Link to={`/alumnos/${data.alumno_id}/estado-cuenta`}>
              {texts.payments.studentAccountLink}
            </Link>
          </Button>
        </Can>
        <Button
          type="button"
          disabled={downloadReceipt.isPending}
          onClick={() => downloadReceipt.mutate(data.id)}
        >
          {downloadReceipt.isPending
            ? texts.loading
            : texts.payments.downloadReceipt}
        </Button>
        <Button type="button" variant="outline" onClick={() => window.print()}>
          {texts.payments.print}
        </Button>
      </div>
      {downloadReceipt.isError ? (
        <p className="screen-only mb-4 text-sm text-destructive" role="alert">
          {downloadReceipt.error instanceof Error
            ? downloadReceipt.error.message
            : texts.payments.errors.generic}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="printable-receipt">
          <CardHeader>
            <CardTitle>{texts.payments.receiptNumber}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-2">
              <FieldValue
                label={texts.payments.listNumber}
                value={data.constancia}
              />
              <FieldValue
                label={texts.payments.listDate}
                value={formatDate(data.fecha_pago)}
              />
              <FieldValue
                label={texts.payments.confirmationStudent}
                value={studentName}
              />
              <FieldValue
                label={texts.payments.listAmount}
                value={formatSoles(data.monto)}
              />
              <FieldValue
                label={texts.payments.listMethod}
                value={texts.payments.methodLabels[data.medio] ?? data.medio}
              />
              <FieldValue
                label={texts.payments.listUser}
                value={
                  user.data
                    ? `${user.data.nombre} ${user.data.apellido}`
                    : user.isPending
                      ? texts.loading
                      : texts.payments.errors.userName
                }
              />
              <div>
                <dt className="text-sm text-muted-foreground">
                  {texts.payments.listState}
                </dt>
                <dd className="mt-1">
                  <PaymentStatusBadge status={data.estado} />
                </dd>
              </div>
              {data.numero_operacion ? (
                <FieldValue
                  label={texts.payments.operationNumber}
                  value={data.numero_operacion}
                />
              ) : null}
              {data.observacion ? (
                <FieldValue
                  label={texts.payments.observation}
                  value={data.observacion}
                />
              ) : null}
            </dl>
            {data.estado === 'anulado' ? (
              <div className="mt-5 rounded-md border border-red-200 bg-red-50 p-3">
                <p className="font-semibold text-red-900">
                  {texts.payments.statusLabels.anulado}
                  {data.anulada_en ? ` · ${formatDate(data.anulada_en)}` : ''}
                </p>
                <p className="mt-1 text-sm text-red-900">
                  {data.motivo_anulacion || texts.states.noInformation}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{texts.payments.quotasTable}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.aplicaciones?.length ? (
              <ul className="divide-y">
                {data.aplicaciones.map((application) => (
                  <li
                    key={application.id ?? application.cuota_id}
                    className="flex flex-wrap justify-between gap-2 py-3"
                  >
                    <span>
                      {application.cuota?.descripcion ??
                        texts.payments.quotaById(
                          application.cuota?.numero ?? application.cuota_id,
                        )}
                    </span>
                    <span className="font-medium">
                      {formatSoles(application.monto_aplicado)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {texts.payments.noApplications}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card id="voucher" className="mt-6 scroll-mt-24">
        <CardHeader>
          <CardTitle>{texts.payments.voucher}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.voucher_disponible ? (
            voucher.isPending ? (
              <StatusState state="loading" />
            ) : voucher.isError ? (
              <StatusState
                state="error"
                message={
                  voucher.error instanceof ApiError &&
                  voucher.error.status === 403
                    ? texts.payments.errors.forbidden
                    : voucher.error.message
                }
                onRetry={() => void voucher.refetch()}
              />
            ) : voucherUrl ? (
              <VoucherPreview
                url={voucherUrl}
                type={voucher.data?.type ?? ''}
              />
            ) : null
          ) : (
            <p className="text-sm text-muted-foreground">
              {texts.payments.noVoucher}
            </p>
          )}
          {data.estado === 'vigente' ? (
            <div className="screen-only space-y-3">
              <p className="text-sm text-muted-foreground">
                {texts.payments.voucherHelp}
              </p>
              <label
                htmlFor="voucher-file"
                className="block text-sm font-medium"
              >
                {texts.payments.chooseVoucher}
              </label>
              <Input
                id="voucher-file"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  setVoucherFile(file)
                  setVoucherErrorMessage('')
                }}
              />
              {voucherFile ? (
                <p className="text-sm">{voucherFile.name}</p>
              ) : null}
              {voucherErrorMessage ? (
                <p className="text-sm text-destructive" role="alert">
                  {voucherErrorMessage}
                </p>
              ) : null}
              <Button
                type="button"
                disabled={!voucherFile || uploadVoucher.isPending}
                onClick={() => void submitVoucher()}
              >
                {uploadVoucher.isPending
                  ? texts.payments.uploading
                  : texts.payments.upload}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {data.estado === 'vigente' ? (
        <Can permiso="pagos.anular" rol={PAYMENT_CANCEL_ROLES}>
          <Card className="screen-only mt-6 max-w-xl">
            <CardHeader>
              <CardTitle>{texts.payments.cancelPayment}</CardTitle>
            </CardHeader>
            <CardContent>
              {!showCancellation ? (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowCancellation(true)}
                >
                  {texts.payments.cancelPayment}
                </Button>
              ) : (
                <form
                  className="space-y-4"
                  onSubmit={cancelForm.handleSubmit(submitCancellation)}
                >
                  <p className="text-sm">{texts.payments.cancelConfirmation}</p>
                  <Field
                    label={texts.payments.cancellationReasonLabel}
                    htmlFor="cancellation-reason"
                    error={cancelForm.formState.errors.motivo?.message}
                  >
                    <textarea
                      id="cancellation-reason"
                      rows={4}
                      maxLength={1000}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      {...cancelForm.register('motivo')}
                    />
                  </Field>
                  {cancelForm.formState.errors.root?.server?.message ? (
                    <p className="text-sm text-destructive" role="alert">
                      {cancelForm.formState.errors.root.server.message}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={cancel.isPending}
                    >
                      {cancel.isPending
                        ? texts.payments.cancelling
                        : texts.payments.confirmCancellation}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={cancel.isPending}
                      onClick={() => setShowCancellation(false)}
                    >
                      {texts.form.cancel}
                    </Button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </Can>
      ) : null}
    </PageFrame>
  )
}

function FieldValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium">{value}</dd>
    </div>
  )
}

function VoucherPreview({ url, type }: { url: string; type: string }) {
  if (type.startsWith('image/')) {
    return (
      <img
        src={url}
        alt={texts.payments.voucher}
        className="max-h-[32rem] max-w-full rounded-md border object-contain"
      />
    )
  }
  return (
    <div className="space-y-2">
      <iframe
        title={texts.payments.voucher}
        src={url}
        className="h-[32rem] w-full rounded-md border"
      />
      <a
        className="text-sm font-medium text-[var(--school-primary)] underline"
        href={url}
        download
      >
        {texts.payments.voucher}
      </a>
    </div>
  )
}
