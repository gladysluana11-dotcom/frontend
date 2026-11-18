import { Link, useParams } from 'react-router-dom'
import { ApiError } from '../../../shared/api/errors'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Can } from '../../../shared/ui/can'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { DataTable, type Column } from '../../../shared/ui/data-table'
import { PageFrame } from '../../../shared/ui/page-frame'
import { StatusState } from '../../../shared/ui/status-state'
import { formatDate, formatSoles } from '../../../shared/utils/format'
import { PaymentStatusBadge } from '../components/payment-status-badge'
import { CollectionManagementPanel } from '../../debts/components/collection-management-panel'
import { COLLECTION_MANAGE_ROLES } from '../../debts/roles'
import {
  useDownloadStudentAccount,
  useStudentAccount,
} from '../hooks/use-payments'
import { PAYMENT_REGISTER_ROLES } from '../roles'
import type { Payment, Quota } from '../schemas'

const quotaColumns: Column<Quota>[] = [
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
    id: 'balance',
    header: texts.payments.balance,
    cell: (quota) => formatSoles(quota.saldo),
  },
  {
    id: 'status',
    header: texts.payments.status,
    cell: (quota) => <PaymentStatusBadge status={quota.estado} />,
  },
]

const paymentColumns: Column<Payment>[] = [
  {
    id: 'receipt',
    header: texts.payments.listNumber,
    cell: (payment) => (
      <Link
        className="font-medium text-[var(--school-primary)] hover:underline"
        to={`/pagos/${payment.id}`}
      >
        {payment.constancia}
      </Link>
    ),
  },
  {
    id: 'date',
    header: texts.payments.listDate,
    cell: (payment) => formatDate(payment.fecha_pago),
  },
  {
    id: 'method',
    header: texts.payments.listMethod,
    cell: (payment) =>
      texts.payments.methodLabels[payment.medio] ?? payment.medio,
  },
  {
    id: 'amount',
    header: texts.payments.listAmount,
    cell: (payment) => formatSoles(payment.monto),
  },
  {
    id: 'status',
    header: texts.payments.listState,
    cell: (payment) => <PaymentStatusBadge status={payment.estado} />,
  },
]

export default function StudentAccountPage() {
  const { id } = useParams()
  const parsedId = Number(id)
  const studentId =
    Number.isInteger(parsedId) && parsedId > 0 ? parsedId : undefined
  const account = useStudentAccount(studentId)
  const download = useDownloadStudentAccount()

  if (!studentId) {
    return (
      <PageFrame title={texts.payments.accountTitle}>
        <StatusState
          state="empty"
          title={texts.students.notFoundTitle}
          message={texts.students.notFoundMessage}
        />
      </PageFrame>
    )
  }

  if (account.isPending) {
    return (
      <PageFrame title={texts.payments.accountTitle}>
        <StatusState state="loading" />
      </PageFrame>
    )
  }

  if (account.isError) {
    const forbidden =
      account.error instanceof ApiError && account.error.status === 403
    return (
      <PageFrame title={texts.payments.accountTitle}>
        <StatusState
          state="error"
          {...(forbidden ? { title: texts.navigation.forbiddenTitle } : {})}
          message={
            forbidden ? texts.payments.errors.forbidden : account.error.message
          }
          onRetry={() => void account.refetch()}
        />
      </PageFrame>
    )
  }

  const data = account.data
  const summary = [
    { title: texts.payments.issued, amount: data.totales.emitido },
    { title: texts.payments.paid, amount: data.totales.pagado },
    { title: texts.payments.balance, amount: data.totales.saldo },
    { title: texts.payments.overdue, amount: data.totales.vencido },
  ]

  return (
    <PageFrame
      eyebrow={texts.payments.accountTitle}
      title={`${data.alumno.apellido}, ${data.alumno.nombre}`}
    >
      <div className="screen-only mb-5 flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={download.isPending}
          onClick={() => download.mutate(studentId)}
        >
          {download.isPending ? texts.loading : texts.payments.downloadAccount}
        </Button>
        <Can permiso="pagos.registrar" rol={PAYMENT_REGISTER_ROLES}>
          <Button asChild variant="outline">
            <Link to={`/pagos/nuevo?alumno_id=${studentId}`}>
              {texts.payments.registerLink}
            </Link>
          </Button>
        </Can>
      </div>
      {download.isError ? (
        <p className="screen-only mb-4 text-sm text-destructive" role="alert">
          {download.error instanceof Error
            ? download.error.message
            : texts.payments.errors.generic}
        </p>
      ) : null}

      <section
        aria-label={texts.payments.accountTitle}
        className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {summary.map((item) => (
          <Card key={item.title}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {item.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">
                {formatSoles(item.amount)}
              </p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">
          {texts.payments.quotasTable}
        </h2>
        <DataTable
          caption={texts.payments.quotasTable}
          columns={quotaColumns}
          rows={data.cuotas}
          getRowId={(quota) => quota.id}
          emptyTitle={texts.states.noInformationTitle}
        />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">
          {texts.payments.paymentsTable}
        </h2>
        <DataTable
          caption={texts.payments.paymentsTable}
          columns={paymentColumns}
          rows={data.pagos}
          getRowId={(payment) => payment.id}
          emptyTitle={texts.payments.noPayments}
        />
      </section>
      <Can permiso="cobranza.gestionar" rol={COLLECTION_MANAGE_ROLES}>
        <div className="mt-8">
          <CollectionManagementPanel studentId={studentId} />
        </div>
      </Can>
    </PageFrame>
  )
}
