import { useEffect, useMemo, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { ApiError } from '../../../shared/api/errors'
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value'
import { texts } from '../../../shared/texts'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { Button } from '../../../shared/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { PageFrame } from '../../../shared/ui/page-frame'
import { Select } from '../../../shared/ui/select'
import { StatusState } from '../../../shared/ui/status-state'
import { formatDate, formatSoles } from '../../../shared/utils/format'
import { useStudent } from '../../students/hooks/use-students'
import { amountWithTwoDecimals } from '../money'
import {
  paymentFormSchema,
  todayInPeru,
  type PaymentFormValues,
  type RegistrationResult,
  type StudentSearchItem,
} from '../schemas'
import { useIdempotencyKey } from '../hooks/use-idempotency-key'
import {
  useDownloadPaymentReceipt,
  useEnrollmentQuotas,
  usePaymentStudentSearch,
  useRegisterPayment,
  useStudentEnrollments,
} from '../hooks/use-payments'

const APPLICATION_STATUSES = new Set(['pendiente', 'parcial', 'vencida'])

export default function NewPaymentPage() {
  const [searchParams] = useSearchParams()
  const requestedStudentId = Number(searchParams.get('alumno_id'))
  const initialStudent = useStudent(
    Number.isInteger(requestedStudentId) && requestedStudentId > 0
      ? requestedStudentId
      : undefined,
  )
  const [student, setStudent] = useState<StudentSearchItem>()
  const [studentSearch, setStudentSearch] = useState('')
  const [enrollmentId, setEnrollmentId] = useState<number>()
  const [confirming, setConfirming] = useState(false)
  const [success, setSuccess] = useState<RegistrationResult>()
  const [submitError, setSubmitError] = useState('')
  const debouncedSearch = useDebouncedValue(studentSearch, 350)
  const students = usePaymentStudentSearch(debouncedSearch)
  const enrollments = useStudentEnrollments(student?.id)
  const quotas = useEnrollmentQuotas(enrollmentId)
  const registerPayment = useRegisterPayment()
  const downloadReceipt = useDownloadPaymentReceipt()
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      fecha_pago: todayInPeru(),
      monto: '',
      medio: 'efectivo',
      numero_operacion: '',
      observacion: '',
      modo_aplicacion: 'automatica',
      aplicaciones: [],
    },
  })
  const values = form.watch()
  const fingerprint = useMemo(
    () => JSON.stringify({ enrollmentId, values }),
    [enrollmentId, values],
  )
  const idempotency = useIdempotencyKey(fingerprint)
  const allowedQuotas = useMemo(
    () =>
      (quotas.data?.items ?? []).filter((quota) =>
        APPLICATION_STATUSES.has(quota.estado),
      ),
    [quotas.data?.items],
  )

  useEffect(() => {
    if (initialStudent.data && !student) {
      setStudent({
        id: initialStudent.data.id,
        nombre: initialStudent.data.nombre,
        apellido: initialStudent.data.apellido,
      })
    }
  }, [initialStudent.data, student])

  useEffect(() => {
    form.setValue(
      'aplicaciones',
      allowedQuotas.map((quota) => ({ cuota_id: quota.id, monto: '' })),
    )
  }, [allowedQuotas, enrollmentId, form])

  const onValid = () => {
    if (!student || enrollmentId === undefined) {
      setSubmitError(texts.payments.chooseEnrollment)
      return
    }
    setSubmitError('')
    setConfirming(true)
  }

  async function confirmPayment() {
    if (!idempotency.key || !student || enrollmentId === undefined) return
    const parsed = paymentFormSchema.safeParse(form.getValues())
    if (!parsed.success) {
      setConfirming(false)
      return
    }
    const current = parsed.data
    const request = {
      matricula_id: enrollmentId,
      fecha_pago: current.fecha_pago,
      monto: current.monto,
      medio: current.medio,
      numero_operacion: current.numero_operacion,
      observacion: current.observacion,
      modo_aplicacion: current.modo_aplicacion,
      aplicaciones:
        current.modo_aplicacion === 'manual'
          ? current.aplicaciones
              .filter((application) => application.monto !== '')
              .map((application) => ({
                cuota_id: application.cuota_id,
                monto: application.monto,
              }))
          : [],
    } as const

    setSubmitError('')
    try {
      const result = await registerPayment.mutateAsync({
        values: request,
        key: idempotency.key,
      })
      idempotency.markSucceeded()
      setSuccess(result)
    } catch (error) {
      idempotency.markFailed(fingerprint)
      setConfirming(false)
      if (error instanceof ApiError && error.status === 422) {
        const applied = applyServerErrors(form.setError, error, [
          'fecha_pago',
          'monto',
          'medio',
          'numero_operacion',
          'observacion',
        ])
        const applicationError = Object.entries(error.errors).find(([field]) =>
          field.startsWith('aplicaciones'),
        )?.[1][0]
        if (applicationError) {
          form.setError('aplicaciones', {
            type: 'server',
            message: applicationError,
          })
        }
        setSubmitError(applied || applicationError ? '' : error.message)
      } else if (error instanceof ApiError && error.status === 409) {
        setSubmitError(texts.payments.errors.conflict)
      } else if (error instanceof ApiError && error.status === 429) {
        setSubmitError(texts.payments.errors.tooMany)
      } else if (error instanceof ApiError && error.status === 403) {
        setSubmitError(texts.payments.errors.forbidden)
      } else {
        setSubmitError(
          error instanceof Error
            ? error.message
            : texts.payments.errors.generic,
        )
      }
    }
  }

  if (success) {
    return (
      <PageFrame title={texts.payments.successTitle}>
        <Card className="printable-receipt max-w-2xl">
          <CardHeader>
            <CardTitle>{texts.payments.successTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>
              <span className="font-medium">
                {texts.payments.receiptNumber}:{' '}
              </span>
              {success.constancia.numero}
            </p>
            <p>
              <span className="font-medium">
                {texts.payments.confirmationStudent}:{' '}
              </span>
              {student?.nombre} {student?.apellido}
            </p>
            <p>
              <span className="font-medium">
                {texts.payments.confirmationAmount}:{' '}
              </span>
              {formatSoles(success.pago.monto)}
            </p>
            <div>
              <h2 className="font-semibold">
                {texts.payments.resultingBalances}
              </h2>
              <ul className="mt-2 list-inside list-disc">
                {success.saldos.map((balance) => (
                  <li key={balance.cuota_id}>
                    {texts.payments.quota} #{balance.cuota_id}:{' '}
                    {formatSoles(balance.saldo)} ·{' '}
                    {texts.payments.statusLabels[balance.estado] ??
                      balance.estado}
                  </li>
                ))}
              </ul>
            </div>
            <div className="screen-only flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={downloadReceipt.isPending}
                onClick={() => downloadReceipt.mutate(success.pago.id)}
              >
                {downloadReceipt.isPending
                  ? texts.loading
                  : texts.payments.downloadReceipt}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
              >
                {texts.payments.print}
              </Button>
              <Button asChild variant="outline">
                <Link to={`/pagos/${success.pago.id}#voucher`}>
                  {texts.payments.uploadVoucher}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link to="/pagos">{texts.payments.backToPayments}</Link>
              </Button>
            </div>
            {downloadReceipt.isError ? (
              <p className="text-sm text-destructive" role="alert">
                {downloadReceipt.error instanceof Error
                  ? downloadReceipt.error.message
                  : texts.payments.errors.generic}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </PageFrame>
    )
  }

  return (
    <PageFrame
      eyebrow={texts.navigation.payments}
      title={texts.payments.newTitle}
    >
      <Link
        to="/pagos"
        className="mb-4 inline-flex text-sm font-medium text-[var(--school-primary)] hover:underline"
      >
        {texts.payments.backToPayments}
      </Link>

      <section
        className="mb-6 max-w-2xl"
        aria-labelledby="student-select-title"
      >
        <h2 id="student-select-title" className="mb-2 text-lg font-semibold">
          {texts.payments.studentSearch}
        </h2>
        {student ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-white p-3">
            <p className="font-medium">
              {student.apellido}, {student.nombre}
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                setStudent(undefined)
                setEnrollmentId(undefined)
                form.setValue('aplicaciones', [])
              }}
            >
              {texts.payments.studentSearch}
            </Button>
          </div>
        ) : (
          <>
            {initialStudent.isError ? (
              <p className="mb-2 text-sm text-destructive" role="alert">
                {initialStudent.error.message}
              </p>
            ) : null}
            <label htmlFor="student-search" className="sr-only">
              {texts.payments.studentSearch}
            </label>
            <Input
              id="student-search"
              type="search"
              value={studentSearch}
              placeholder={texts.payments.studentSearchPlaceholder}
              onChange={(event) => setStudentSearch(event.target.value)}
            />
            {students.isError ? (
              <p className="mt-2 text-sm text-destructive" role="alert">
                {students.error.message}
              </p>
            ) : null}
            {students.isPending && debouncedSearch.trim().length >= 2 ? (
              <p className="mt-2 text-sm text-muted-foreground" role="status">
                {texts.loading}
              </p>
            ) : null}
            {students.data?.items.length ? (
              <ul className="mt-1 max-h-56 overflow-y-auto rounded-md border bg-white">
                {students.data.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted"
                      onClick={() => {
                        setStudent(item)
                        setStudentSearch('')
                        setEnrollmentId(undefined)
                      }}
                    >
                      {item.apellido}, {item.nombre}
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
      </section>

      {student ? (
        <section className="mb-6 max-w-2xl">
          <label
            htmlFor="enrollment"
            className="mb-1 block text-sm font-medium"
          >
            {texts.payments.chooseEnrollment}
          </label>
          {enrollments.isError ? (
            <StatusState state="error" message={enrollments.error.message} />
          ) : (
            <Select
              id="enrollment"
              value={enrollmentId ?? ''}
              onChange={(event) => {
                setEnrollmentId(
                  event.target.value ? Number(event.target.value) : undefined,
                )
                form.setValue('aplicaciones', [])
              }}
              disabled={enrollments.isPending}
            >
              <option value="">
                {enrollments.isPending
                  ? texts.loading
                  : texts.payments.chooseEnrollment}
              </option>
              {(enrollments.data?.items ?? []).map((enrollment) => (
                <option key={enrollment.id} value={enrollment.id}>
                  {enrollment.anio_escolar_id
                    ? `${texts.students.enrollmentYear} ${enrollment.anio_escolar_id}`
                    : `${texts.students.enrollments} #${enrollment.id}`}
                  {enrollment.estado ? ` · ${enrollment.estado}` : ''}
                </option>
              ))}
            </Select>
          )}
          {enrollments.data?.items.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {texts.payments.noEnrollments}
            </p>
          ) : null}
        </section>
      ) : null}

      {enrollmentId !== undefined ? (
        <>
          {quotas.isPending ? (
            <StatusState state="loading" />
          ) : quotas.isError ? (
            <StatusState
              state="error"
              message={quotas.error.message}
              onRetry={() => void quotas.refetch()}
            />
          ) : (
            <section className="mb-6 max-w-3xl">
              <h2 className="mb-2 text-lg font-semibold">
                {texts.payments.quotasTitle}
              </h2>
              {allowedQuotas.length === 0 ? (
                <p className="rounded-lg border bg-white p-4 text-sm text-muted-foreground">
                  {texts.states.noInformation}
                </p>
              ) : (
                <div className="overflow-x-auto rounded-xl border bg-white">
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">
                      {texts.payments.quotasTitle}
                    </caption>
                    <thead className="border-b bg-muted/60">
                      <tr>
                        <th scope="col" className="px-3 py-2">
                          {texts.payments.quota}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {texts.payments.dueDate}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {texts.payments.balance}
                        </th>
                        <th scope="col" className="px-3 py-2">
                          {texts.payments.status}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allowedQuotas.map((quota) => (
                        <tr key={quota.id}>
                          <td className="px-3 py-2">
                            {quota.descripcion ||
                              texts.payments.quotaById(quota.numero)}
                          </td>
                          <td className="px-3 py-2">
                            {formatDate(quota.vencimiento)}
                          </td>
                          <td className="px-3 py-2">
                            {formatSoles(quota.saldo)}
                          </td>
                          <td className="px-3 py-2">
                            {texts.payments.statusLabels[quota.estado] ??
                              quota.estado}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}
        </>
      ) : null}

      {enrollmentId !== undefined ? (
        <form
          className="max-w-3xl space-y-5"
          onSubmit={form.handleSubmit(onValid)}
        >
          <fieldset
            disabled={registerPayment.isPending}
            className="space-y-5 disabled:opacity-70"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label={texts.payments.date}
                htmlFor="payment-date"
                error={form.formState.errors.fecha_pago?.message}
              >
                <Input
                  id="payment-date"
                  type="date"
                  max={todayInPeru()}
                  aria-invalid={Boolean(form.formState.errors.fecha_pago)}
                  aria-describedby={
                    form.formState.errors.fecha_pago
                      ? 'payment-date-error'
                      : undefined
                  }
                  {...form.register('fecha_pago')}
                />
              </Field>
              <Field
                label={texts.payments.amount}
                htmlFor="payment-amount"
                error={form.formState.errors.monto?.message}
              >
                <Input
                  id="payment-amount"
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  aria-invalid={Boolean(form.formState.errors.monto)}
                  aria-describedby={
                    form.formState.errors.monto
                      ? 'payment-amount-error'
                      : undefined
                  }
                  {...form.register('monto')}
                />
              </Field>
              <Field
                label={texts.payments.method}
                htmlFor="payment-method"
                error={form.formState.errors.medio?.message}
              >
                <Select
                  id="payment-method"
                  aria-invalid={Boolean(form.formState.errors.medio)}
                  {...form.register('medio')}
                >
                  {Object.entries(texts.payments.methodLabels).map(
                    ([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ),
                  )}
                </Select>
              </Field>
              {['deposito', 'transferencia'].includes(values.medio) ? (
                <Field
                  label={texts.payments.operationNumber}
                  htmlFor="payment-operation"
                  error={form.formState.errors.numero_operacion?.message}
                >
                  <Input
                    id="payment-operation"
                    maxLength={100}
                    {...form.register('numero_operacion')}
                  />
                </Field>
              ) : null}
              <Field
                label={texts.payments.observation}
                htmlFor="payment-observation"
                error={form.formState.errors.observacion?.message}
              >
                <Input
                  id="payment-observation"
                  maxLength={1000}
                  {...form.register('observacion')}
                />
              </Field>
            </div>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold">
                {texts.payments.applicationMode}
              </legend>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="automatica"
                  {...form.register('modo_aplicacion')}
                />
                {texts.payments.automaticApplication}
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  value="manual"
                  {...form.register('modo_aplicacion')}
                />
                {texts.payments.manualApplication}
              </label>
            </fieldset>

            {values.modo_aplicacion === 'manual' ? (
              <div className="space-y-3">
                {allowedQuotas.map((quota, index) => (
                  <Field
                    key={quota.id}
                    label={`${quota.descripcion} · ${texts.payments.balance}: ${formatSoles(quota.saldo)}`}
                    htmlFor={`application-${quota.id}`}
                  >
                    <Input
                      id={`application-${quota.id}`}
                      type="text"
                      inputMode="decimal"
                      aria-label={`${texts.payments.applicationAmount}: ${quota.descripcion}`}
                      {...form.register(`aplicaciones.${index}.monto`)}
                    />
                  </Field>
                ))}
                {form.formState.errors.aplicaciones ? (
                  <p className="text-sm text-destructive" role="alert">
                    {form.formState.errors.aplicaciones.message ??
                      texts.payments.validation.applicationsSum}
                  </p>
                ) : null}
              </div>
            ) : null}
          </fieldset>

          {submitError ? (
            <p className="text-sm text-destructive" role="alert">
              {submitError}
            </p>
          ) : null}
          {form.formState.errors.root?.server?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.root.server.message}
            </p>
          ) : null}

          <Button type="submit" disabled={registerPayment.isPending}>
            {texts.payments.submit}
          </Button>
        </form>
      ) : null}

      {confirming ? (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/50 p-4"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="payment-confirm-title"
        >
          <Card className="w-full max-w-lg">
            <CardHeader>
              <CardTitle id="payment-confirm-title">
                {texts.payments.confirmTitle}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="font-medium">
                    {texts.payments.confirmationStudent}
                  </dt>
                  <dd>
                    {student?.nombre} {student?.apellido}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">
                    {texts.payments.confirmationAmount}
                  </dt>
                  <dd>
                    {formatSoles(
                      amountWithTwoDecimals(form.getValues('monto')),
                    )}
                  </dd>
                </div>
                <div>
                  <dt className="font-medium">
                    {texts.payments.confirmationMethod}
                  </dt>
                  <dd>
                    {texts.payments.methodLabels[form.getValues('medio')]}
                  </dd>
                </div>
              </dl>
              {submitError ? (
                <p className="text-sm text-destructive" role="alert">
                  {submitError}
                </p>
              ) : null}
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={registerPayment.isPending}
                  onClick={() => setConfirming(false)}
                >
                  {texts.form.cancel}
                </Button>
                <Button
                  type="button"
                  disabled={registerPayment.isPending}
                  onClick={() => void confirmPayment()}
                >
                  {registerPayment.isPending
                    ? texts.payments.submitting
                    : texts.payments.submit}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </PageFrame>
  )
}
