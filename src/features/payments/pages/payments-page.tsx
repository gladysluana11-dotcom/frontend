import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value'
import { useTableState } from '../../../shared/hooks/use-table-state'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Can } from '../../../shared/ui/can'
import { DataTable, type Column } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { PageFrame } from '../../../shared/ui/page-frame'
import { Select } from '../../../shared/ui/select'
import { useStudent } from '../../students/hooks/use-students'
import { ApiError } from '../../../shared/api/errors'
import { PAYMENT_REGISTER_ROLES } from '../roles'
import { PaymentStatusBadge } from '../components/payment-status-badge'
import {
  usePayments,
  usePaymentStudentSearch,
  usePaymentUser,
} from '../hooks/use-payments'
import type { Payment } from '../schemas'
import { formatDate, formatSoles } from '../../../shared/utils/format'

const FILTER_KEYS = ['alumno_id', 'desde', 'hasta', 'medio', 'estado'] as const

function StudentCell({ payment }: { payment: Payment }) {
  const student = useStudent(payment.alumno_id)

  return (
    <Link
      className="font-medium text-[var(--school-primary)] hover:underline"
      to={`/pagos/${payment.id}`}
    >
      {student.isPending
        ? texts.loading
        : student.data
          ? `${student.data.nombre} ${student.data.apellido}`
          : texts.payments.errors.studentName}
    </Link>
  )
}

function UserCell({ payment }: { payment: Payment }) {
  const user = usePaymentUser(payment.usuario_id)
  return user.isPending
    ? texts.loading
    : user.data
      ? `${user.data.nombre} ${user.data.apellido}`
      : texts.payments.errors.userName
}

export default function PaymentsPage() {
  const table = useTableState(FILTER_KEYS)
  const { state } = table
  const selectedStudentId = Number(state.filters.alumno_id)
  const selectedStudent = useStudent(
    Number.isInteger(selectedStudentId) && selectedStudentId > 0
      ? selectedStudentId
      : undefined,
  )
  const [studentSearch, setStudentSearch] = useState('')
  const debouncedSearch = useDebouncedValue(studentSearch, 350)
  const searchResults = usePaymentStudentSearch(debouncedSearch)
  const payments = usePayments({
    page: state.page,
    perPage: state.perPage,
    ...(Number.isInteger(selectedStudentId) && selectedStudentId > 0
      ? { studentId: selectedStudentId }
      : {}),
    ...(state.filters.desde ? { desde: state.filters.desde } : {}),
    ...(state.filters.hasta ? { hasta: state.filters.hasta } : {}),
    ...(state.filters.medio ? { medio: state.filters.medio } : {}),
    ...(state.filters.estado ? { estado: state.filters.estado } : {}),
    ...(state.sort ? { sort: state.sort } : {}),
    direction: state.direction,
  })

  const columns: Column<Payment>[] = [
    {
      id: 'receipt',
      header: texts.payments.listNumber,
      sortKey: 'id',
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
      sortKey: 'fecha_pago',
      cell: (payment) => formatDate(payment.fecha_pago),
    },
    {
      id: 'student',
      header: texts.payments.listStudent,
      cell: (payment) => <StudentCell payment={payment} />,
    },
    {
      id: 'method',
      header: texts.payments.listMethod,
      sortKey: 'medio',
      cell: (payment) =>
        texts.payments.methodLabels[payment.medio] ?? payment.medio,
    },
    {
      id: 'amount',
      header: texts.payments.listAmount,
      sortKey: 'monto',
      cell: (payment) => formatSoles(payment.monto),
    },
    {
      id: 'user',
      header: texts.payments.listUser,
      hideBelow: 'md',
      cell: (payment) => <UserCell payment={payment} />,
    },
    {
      id: 'status',
      header: texts.payments.listState,
      sortKey: 'estado',
      cell: (payment) => <PaymentStatusBadge status={payment.estado} />,
    },
  ]

  const fromDate = state.filters.desde
  const toDate = state.filters.hasta
  const datesInvalid = Boolean(fromDate && toDate && fromDate > toDate)
  const listError =
    payments.error instanceof ApiError && payments.error.status === 403
      ? new Error(texts.payments.errors.forbidden)
      : payments.error

  return (
    <PageFrame
      eyebrow={texts.navigation.payments}
      title={texts.payments.title}
      description={texts.payments.description}
    >
      <Can permiso="pagos.registrar" rol={PAYMENT_REGISTER_ROLES}>
        <div className="mb-4 flex justify-end">
          <Button asChild>
            <Link to="/pagos/nuevo">{texts.payments.registerLink}</Link>
          </Button>
        </div>
      </Can>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <label
            htmlFor="payment-student-search"
            className="mb-1 block text-sm font-medium"
          >
            {texts.payments.filterStudent}
          </label>
          <Input
            id="payment-student-search"
            type="search"
            value={
              studentSearch ||
              (selectedStudent.data
                ? `${selectedStudent.data.nombre} ${selectedStudent.data.apellido}`
                : '')
            }
            placeholder={texts.payments.studentSearchPlaceholder}
            onChange={(event) => {
              const value = event.target.value
              setStudentSearch(value)
              table.setFilter('alumno_id', undefined)
            }}
          />
          {studentSearch.trim().length >= 2 &&
          searchResults.data?.items.length ? (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border bg-white shadow-lg">
              {searchResults.data.items.map((student) => (
                <li key={student.id}>
                  <button
                    type="button"
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted focus-visible:bg-muted"
                    onClick={() => {
                      table.setFilter('alumno_id', String(student.id))
                      setStudentSearch('')
                    }}
                  >
                    {student.apellido}, {student.nombre}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {studentSearch.trim().length >= 2 && searchResults.isPending ? (
            <p className="mt-1 text-sm text-muted-foreground" role="status">
              {texts.loading}
            </p>
          ) : null}
          {searchResults.isError ? (
            <p className="mt-1 text-sm text-destructive" role="alert">
              {searchResults.error.message}
            </p>
          ) : null}
          {studentSearch.trim().length >= 2 &&
          !searchResults.isPending &&
          !searchResults.isError &&
          searchResults.data?.items.length === 0 ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {texts.payments.studentSearchEmpty}
            </p>
          ) : null}
          {state.filters.alumno_id ? (
            <p
              className="mt-1 text-xs text-muted-foreground"
              aria-live="polite"
            >
              {selectedStudent.isPending
                ? texts.loading
                : selectedStudent.data
                  ? `${selectedStudent.data.apellido}, ${selectedStudent.data.nombre}`
                  : texts.payments.errors.studentName}
            </p>
          ) : null}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.payments.filterFrom}
          </span>
          <Input
            type="date"
            value={state.filters.desde ?? ''}
            onChange={(event) =>
              table.setFilter('desde', event.target.value || undefined)
            }
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.payments.filterTo}
          </span>
          <Input
            type="date"
            value={state.filters.hasta ?? ''}
            onChange={(event) =>
              table.setFilter('hasta', event.target.value || undefined)
            }
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.payments.filterMethod}
          </span>
          <Select
            value={state.filters.medio ?? ''}
            onChange={(event) =>
              table.setFilter('medio', event.target.value || undefined)
            }
          >
            <option value="">{texts.payments.allMethods}</option>
            {Object.entries(texts.payments.methodLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ),
            )}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.payments.filterState}
          </span>
          <Select
            value={state.filters.estado ?? ''}
            onChange={(event) =>
              table.setFilter('estado', event.target.value || undefined)
            }
          >
            <option value="">{texts.payments.allStates}</option>
            <option value="vigente">
              {texts.payments.statusLabels.vigente}
            </option>
            <option value="anulado">
              {texts.payments.statusLabels.anulado}
            </option>
          </Select>
        </label>
      </div>

      {datesInvalid ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {texts.payments.dateRangeError}
        </p>
      ) : null}

      <DataTable
        caption={texts.payments.listCaption}
        columns={columns}
        rows={datesInvalid ? [] : (payments.data?.items ?? [])}
        getRowId={(payment) => payment.id}
        isLoading={payments.isPending}
        isFetching={payments.isFetching}
        error={datesInvalid ? null : listError}
        onRetry={() => void payments.refetch()}
        pagination={datesInvalid ? undefined : payments.data?.pagination}
        onPageChange={table.setPage}
        onPerPageChange={table.setPerPage}
        sort={{ key: state.sort, direction: state.direction }}
        onSortChange={table.setSort}
        emptyTitle={texts.payments.noPayments}
      />
    </PageFrame>
  )
}
