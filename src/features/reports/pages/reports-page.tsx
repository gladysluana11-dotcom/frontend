import { useMemo } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTableState } from '../../../shared/hooks/use-table-state'
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
import { PageFrame } from '../../../shared/ui/page-frame'
import { Select } from '../../../shared/ui/select'
import { StatusState } from '../../../shared/ui/status-state'
import { formatDate, formatSoles } from '../../../shared/utils/format'
import { useSession } from '../../auth/hooks/use-session'
import { extractRoles, normalizeRole } from '../../auth/utils/roles'
import { usePrivateStudentSearch } from '../../debts/hooks/use-private-student-search'
import { gradeLabel } from '../../catalog/api/catalog-api'
import {
  useAcademicYears,
  useGrades,
  useLevels,
  useSections,
} from '../../catalog/hooks/use-catalog'
import {
  useDownloadReport,
  useEnrollmentReport,
  useMonthlyIncomeReport,
  usePaymentReport,
} from '../hooks/use-reports'
import type {
  EnrollmentReportRow,
  EnrollmentReport,
  MonthlyIncomeRow,
  MonthlyIncomeReport,
  PaymentReportRow,
  PaymentReport,
} from '../schemas'
import type { ReportKind, ReportParams } from '../api/reports-api'

const FILTER_KEYS = [
  'desde',
  'hasta',
  'medio',
  'usuario_id',
  'anio_escolar_id',
  'nivel_id',
  'grado_id',
  'seccion_id',
  'estado',
] as const

const REPORTS: { id: ReportKind; label: string }[] = [
  { id: 'matriculas', label: texts.reports.enrollments },
  { id: 'pagos', label: texts.reports.payments },
  { id: 'ingresos-mensuales', label: texts.reports.monthlyIncome },
]

function positiveInteger(value: string | undefined): number | undefined {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined
}

function reportParams(
  filters: Record<string, string>,
  search: string,
): ReportParams {
  const methods = [
    'efectivo',
    'deposito',
    'transferencia',
    'billetera_digital',
  ] as const
  const states = [
    'pre_inscrito',
    'pendiente_documentos',
    'matriculado',
    'retirado',
  ] as const
  const medio = methods.find((value) => value === filters.medio)
  const estado = states.find((value) => value === filters.estado)
  const usuarioId = positiveInteger(filters.usuario_id)
  const anioEscolarId = positiveInteger(filters.anio_escolar_id)
  const nivelId = positiveInteger(filters.nivel_id)
  const gradoId = positiveInteger(filters.grado_id)
  const seccionId = positiveInteger(filters.seccion_id)
  return {
    ...(filters.desde ? { desde: filters.desde } : {}),
    ...(filters.hasta ? { hasta: filters.hasta } : {}),
    ...(medio ? { medio } : {}),
    ...(usuarioId ? { usuarioId } : {}),
    ...(anioEscolarId ? { anioEscolarId } : {}),
    ...(nivelId ? { nivelId } : {}),
    ...(gradoId ? { gradoId } : {}),
    ...(seccionId ? { seccionId } : {}),
    ...(estado ? { estado } : {}),
    ...(search ? { buscar: search } : {}),
  }
}

const enrollmentColumns: Column<EnrollmentReportRow>[] = [
  {
    id: 'student',
    header: texts.reports.student,
    cell: (row) => `${row.apellido}, ${row.nombre}`,
  },
  {
    id: 'grade',
    header: texts.debts.grade,
    cell: (row) =>
      [row.nivel, row.grado, row.seccion].filter(Boolean).join(' · ') || '—',
  },
  {
    id: 'year',
    header: texts.reports.schoolYear,
    cell: (row) => row.anio_escolar ?? '—',
  },
  {
    id: 'status',
    header: texts.reports.state,
    cell: (row) => texts.reports.statusLabels[row.estado] ?? row.estado,
  },
  {
    id: 'pending-documents',
    header: texts.reports.documentsPending,
    cell: (row) => row.documentos_pendientes,
  },
]

const paymentColumns: Column<PaymentReportRow>[] = [
  {
    id: 'date',
    header: texts.reports.date,
    cell: (row) => formatDate(row.fecha_pago),
  },
  {
    id: 'student',
    header: texts.reports.student,
    cell: (row) => row.alumno,
  },
  {
    id: 'user',
    header: texts.reports.user,
    cell: (row) => row.usuario,
  },
  {
    id: 'method',
    header: texts.reports.method,
    cell: (row) => texts.payments.methodLabels[row.medio] ?? row.medio,
  },
  {
    id: 'amount',
    header: texts.reports.amount,
    cell: (row) => formatSoles(row.monto),
  },
  {
    id: 'state',
    header: texts.reports.state,
    cell: (row) => row.estado,
  },
  {
    id: 'receipt',
    header: texts.reports.receipt,
    cell: (row) => row.constancia ?? '—',
  },
]

const incomeColumns: Column<MonthlyIncomeRow>[] = [
  { id: 'month', header: texts.reports.month, cell: (row) => row.mes },
  {
    id: 'issued',
    header: texts.reports.issued,
    cell: (row) => formatSoles(row.cuotas_emitidas),
  },
  {
    id: 'collected',
    header: texts.reports.collected,
    cell: (row) => formatSoles(row.cuotas_cobradas),
  },
]

export default function ReportsPage() {
  const [urlParams, setUrlParams] = useSearchParams()
  const table = useTableState(FILTER_KEYS)
  const search = usePrivateStudentSearch()
  const { data: user } = useSession()
  const roles = user ? extractRoles(user) : []
  const coordinator = roles.includes(normalizeRole('coordinacion'))
  const availableReports = coordinator ? REPORTS.slice(0, 1) : REPORTS
  const report =
    availableReports.find((item) => item.id === urlParams.get('reporte'))?.id ??
    availableReports[0]?.id ??
    'matriculas'
  const params = useMemo(
    () => reportParams(table.state.filters, search.debouncedSearch),
    [table.state.filters, search.debouncedSearch],
  )
  const enrollments = useEnrollmentReport(params, report === 'matriculas')
  const payments = usePaymentReport(params, report === 'pagos')
  const income = useMonthlyIncomeReport(params, report === 'ingresos-mensuales')
  const download = useDownloadReport()
  const setFilter = (key: string, value: string) =>
    table.setFilter(key, value || undefined)

  function chooseReport(value: string) {
    const next = new URLSearchParams(urlParams)
    if (value === 'matriculas') next.delete('reporte')
    else next.set('reporte', value)
    setUrlParams(next, { replace: true })
  }

  return (
    <PageFrame
      eyebrow={texts.reports.title}
      title={texts.reports.title}
      description={texts.reports.description}
    >
      {coordinator ? (
        <p className="mb-4 text-sm text-muted-foreground">
          {texts.reports.coordinatorNote}{' '}
          <Link
            className="font-medium text-[var(--school-primary)] underline"
            to="/deudas/por-aula"
          >
            {texts.reports.classroomDebt}
          </Link>
        </p>
      ) : null}
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <Field label={texts.reports.reportType} htmlFor="report-type">
          <Select
            id="report-type"
            value={report}
            onChange={(event) => chooseReport(event.target.value)}
          >
            {availableReports.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          label={texts.reports.searchStudent}
          htmlFor="report-search"
          help={texts.reports.searchPlaceholder}
        >
          <Input
            id="report-search"
            value={search.search}
            autoComplete="off"
            onChange={(event) => search.setSearch(event.target.value)}
          />
        </Field>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterInput
          label={texts.reports.from}
          type="date"
          value={table.state.filters.desde ?? ''}
          onChange={(value) => setFilter('desde', value)}
        />
        <FilterInput
          label={texts.reports.to}
          type="date"
          value={table.state.filters.hasta ?? ''}
          onChange={(value) => setFilter('hasta', value)}
        />
        {report === 'pagos' ? (
          <>
            <Field label={texts.reports.method} htmlFor="report-method">
              <Select
                id="report-method"
                value={table.state.filters.medio ?? ''}
                onChange={(event) => setFilter('medio', event.target.value)}
              >
                <option value="">{texts.reports.allMethods}</option>
                {Object.entries(texts.payments.methodLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <FilterInput
              label={texts.reports.userId}
              type="number"
              min="1"
              value={table.state.filters.usuario_id ?? ''}
              onChange={(value) => setFilter('usuario_id', value)}
            />
          </>
        ) : null}
        {report === 'matriculas' ? (
          <>
            <Field
              label={texts.reports.enrollmentStatus}
              htmlFor="report-state"
            >
              <Select
                id="report-state"
                value={table.state.filters.estado ?? ''}
                onChange={(event) => setFilter('estado', event.target.value)}
              >
                <option value="">{texts.reports.allStates}</option>
                {Object.entries(texts.reports.statusLabels).map(
                  ([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ),
                )}
              </Select>
            </Field>
            <EnrollmentCatalogFilters
              filters={table.state.filters}
              setFilter={setFilter}
            />
          </>
        ) : null}
        <div className="flex items-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              table.clearFilters()
              search.setSearch('')
            }}
          >
            {texts.table.clearFilters}
          </Button>
        </div>
      </div>
      {download.isError ? (
        <p className="mb-4 text-sm text-destructive" role="alert">
          {download.error.message}
        </p>
      ) : null}
      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={download.isPending}
          onClick={() =>
            download.mutate({ kind: report, params, format: 'pdf' })
          }
        >
          {texts.reports.downloadPdf}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={download.isPending}
          onClick={() =>
            download.mutate({ kind: report, params, format: 'xlsx' })
          }
        >
          {texts.reports.downloadExcel}
        </Button>
      </div>

      {report === 'matriculas' ? (
        <EnrollmentReportView query={enrollments} />
      ) : report === 'pagos' ? (
        <PaymentReportView query={payments} />
      ) : (
        <MonthlyIncomeReportView query={income} />
      )}
    </PageFrame>
  )
}

function FilterInput({
  label,
  type = 'number',
  value,
  onChange,
  min,
}: {
  label: string
  type?: 'date' | 'number'
  value: string
  onChange: (value: string) => void
  min?: string
}) {
  const id = `report-${label.toLowerCase().replaceAll(' ', '-')}`
  return (
    <Field label={label} htmlFor={id}>
      <Input
        id={id}
        type={type}
        min={min}
        step={type === 'number' ? '1' : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

function ReportCatalogFilter({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: { id: number; label: string }[]
}) {
  const id = `report-${label.toLowerCase().replaceAll(' ', '-')}`
  return (
    <Field label={label} htmlFor={id}>
      <Select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{texts.reports.allCatalogOptions}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </Select>
    </Field>
  )
}

function EnrollmentCatalogFilters({
  filters,
  setFilter,
}: {
  filters: Record<string, string>
  setFilter: (key: string, value: string) => void
}) {
  const years = useAcademicYears()
  const levels = useLevels()
  const grades = useGrades()
  const sections = useSections()
  const catalogError = [years, levels, grades, sections].find(
    (query) => query.isError,
  )?.error
  const catalogs = [
    {
      label: texts.reports.yearId,
      key: 'anio_escolar_id',
      options: (years.data ?? []).map((item) => ({
        id: item.id,
        label: item.nombre,
      })),
    },
    {
      label: texts.reports.levelId,
      key: 'nivel_id',
      options: (levels.data ?? []).map((item) => ({
        id: item.id,
        label: item.nombre,
      })),
    },
    {
      label: texts.reports.gradeId,
      key: 'grado_id',
      options: (grades.data ?? []).map((item) => ({
        id: item.id,
        label: gradeLabel(item, levels.data ?? []),
      })),
    },
    {
      label: texts.reports.sectionId,
      key: 'seccion_id',
      options: (sections.data ?? []).map((item) => ({
        id: item.id,
        label: item.nombre,
      })),
    },
  ]

  return (
    <>
      {catalogs.map((catalog) => (
        <ReportCatalogFilter
          key={catalog.key}
          label={catalog.label}
          value={filters[catalog.key] ?? ''}
          onChange={(value) => setFilter(catalog.key, value)}
          options={catalog.options}
        />
      ))}
      {catalogError ? (
        <p className="text-sm text-destructive sm:col-span-2" role="alert">
          {catalogError.message}
        </p>
      ) : null}
    </>
  )
}

function SummaryCard({
  label,
  value,
}: {
  label: string
  value: string | number
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold">{value}</p>
      </CardContent>
    </Card>
  )
}

function EnrollmentReportView({
  query,
}: {
  query: ReturnType<typeof useEnrollmentReport>
}) {
  if (query.isPending)
    return <StatusState state="loading" message={texts.reports.loading} />
  if (query.isError)
    return (
      <StatusState
        state="error"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    )
  const report: EnrollmentReport = query.data
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label={texts.reports.totalEnrollments}
          value={report.resumen.total_matriculas}
        />
        <SummaryCard
          label={texts.reports.pendingEnrollments}
          value={report.resumen.pendientes_completar}
        />
      </div>
      <DataTable
        caption={texts.reports.enrollments}
        columns={enrollmentColumns}
        rows={report.filas}
        getRowId={(row) => row.matricula_id}
        emptyTitle={texts.reports.empty}
      />
    </>
  )
}

function PaymentReportView({
  query,
}: {
  query: ReturnType<typeof usePaymentReport>
}) {
  if (query.isPending)
    return <StatusState state="loading" message={texts.reports.loading} />
  if (query.isError)
    return (
      <StatusState
        state="error"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    )
  const report: PaymentReport = query.data
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label={texts.reports.paymentCount}
          value={report.resumen.cantidad}
        />
        <SummaryCard
          label={texts.reports.totalPayments}
          value={formatSoles(report.resumen.total_vigente)}
        />
      </div>
      <DataTable
        caption={texts.reports.payments}
        columns={paymentColumns}
        rows={report.filas}
        getRowId={(row) => row.pago_id}
        emptyTitle={texts.reports.empty}
      />
    </>
  )
}

function MonthlyIncomeReportView({
  query,
}: {
  query: ReturnType<typeof useMonthlyIncomeReport>
}) {
  if (query.isPending)
    return <StatusState state="loading" message={texts.reports.loading} />
  if (query.isError)
    return (
      <StatusState
        state="error"
        message={query.error.message}
        onRetry={() => void query.refetch()}
      />
    )
  const report: MonthlyIncomeReport = query.data
  return (
    <>
      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <SummaryCard
          label={texts.reports.totalIssued}
          value={formatSoles(report.resumen.total_emitido)}
        />
        <SummaryCard
          label={texts.reports.totalCollected}
          value={formatSoles(report.resumen.total_cobrado)}
        />
      </div>
      <DataTable
        caption={texts.reports.monthlyIncome}
        columns={incomeColumns}
        rows={report.filas}
        getRowId={(row) => row.mes}
        emptyTitle={texts.reports.empty}
      />
    </>
  )
}
