import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTableState } from '../../../shared/hooks/use-table-state'
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
import { PAYMENT_VIEW_ROLES } from '../../payments/roles'
import { COLLECTION_MANAGE_ROLES } from '../roles'
import { useDebtsByClass, useDownloadDebtsByClass } from '../hooks/use-debts'
import { usePrivateStudentSearch } from '../hooks/use-private-student-search'
import { CollectionManagementPanel } from '../components/collection-management-panel'
import { DebtFilterFields } from '../components/debt-filter-fields'
import { debtParamsFromState } from '../utils'
import { formatSoles } from '../../../shared/utils/format'
import type { Debt, DebtSection } from '../schemas'

const FILTER_KEYS = [
  'nivel_id',
  'grado_id',
  'seccion_id',
  'anio_escolar_id',
  'dias_atraso_min',
  'monto_min',
] as const

export default function DebtByClassPage() {
  const table = useTableState(FILTER_KEYS)
  const search = usePrivateStudentSearch()
  const params = useMemo(
    () => debtParamsFromState(table.state, search.debouncedSearch),
    [table.state, search.debouncedSearch],
  )
  const sections = useDebtsByClass(params)
  const download = useDownloadDebtsByClass()
  const [selected, setSelected] = useState<Debt>()

  const columns: Column<Debt>[] = [
    {
      id: 'student',
      header: texts.debts.name,
      cell: (debt) => (
        <div>
          <p>
            {debt.apellido}, {debt.nombre}
          </p>
          <Can permiso="pagos.ver" rol={PAYMENT_VIEW_ROLES}>
            <Link
              className="text-sm text-[var(--school-primary)] underline"
              to={`/alumnos/${debt.alumno_id}/estado-cuenta`}
            >
              {texts.debts.viewAccount}
            </Link>
          </Can>
        </div>
      ),
    },
    {
      id: 'overdue',
      header: texts.debts.overdueAmount,
      cell: (debt) => formatSoles(debt.total_vencido),
    },
    {
      id: 'pending',
      header: texts.debts.pendingAmount,
      cell: (debt) => formatSoles(debt.total_pendiente),
    },
    {
      id: 'installments',
      header: texts.debts.overdueInstallments,
      cell: (debt) => debt.cuotas_vencidas,
    },
    {
      id: 'delay',
      header: texts.debts.overdueDays,
      cell: (debt) => debt.dias_atraso,
    },
    {
      id: 'management',
      header: texts.debts.manageCollections,
      cell: (debt) => (
        <Can permiso="cobranza.gestionar" rol={COLLECTION_MANAGE_ROLES}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              setSelected((current) =>
                current?.alumno_id === debt.alumno_id ? undefined : debt,
              )
            }
          >
            {texts.debts.manageCollections}
          </Button>
        </Can>
      ),
    },
  ]

  const sectionName = (section: DebtSection) =>
    [section.nivel, section.grado, section.seccion]
      .filter(Boolean)
      .join(' · ') || `#${section.seccion_id}`

  return (
    <PageFrame
      eyebrow={texts.debts.byClassTitle}
      title={texts.debts.byClassTitle}
      description={texts.debts.byClassDescription}
    >
      <div className="screen-only mb-4 flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => window.print()}>
          {texts.debts.print}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={download.isPending}
          onClick={() => download.mutate({ params, format: 'pdf' })}
        >
          {texts.debts.downloadPdf}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={download.isPending}
          onClick={() => download.mutate({ params, format: 'xlsx' })}
        >
          {texts.debts.downloadExcel}
        </Button>
      </div>
      {download.isError ? (
        <p className="screen-only mb-4 text-sm text-destructive" role="alert">
          {download.error.message}
        </p>
      ) : null}
      <DebtFilterFields
        table={table}
        search={search.search}
        onSearchChange={search.setSearch}
      />
      {sections.isPending ? (
        <StatusState state="loading" />
      ) : sections.isError ? (
        <StatusState
          state="error"
          message={sections.error.message}
          onRetry={() => void sections.refetch()}
        />
      ) : sections.data.length === 0 ? (
        <StatusState state="empty" title={texts.table.noResults} />
      ) : (
        <div className="space-y-5">
          {sections.data.map((section) => (
            <Card key={section.seccion_id} className="printable-debt-section">
              <CardHeader>
                <CardTitle>{sectionName(section)}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {texts.debts.sectionCount}: {section.cantidad_alumnos}
                  {' · '}
                  {texts.debts.overdueAmount}:{' '}
                  {formatSoles(section.total_vencido)}
                  {' · '}
                  {texts.debts.pendingAmount}:{' '}
                  {formatSoles(section.total_pendiente)}
                </p>
              </CardHeader>
              <CardContent>
                <DataTable
                  caption={`${texts.debts.table}: ${sectionName(section)}`}
                  columns={columns}
                  rows={section.alumnos}
                  getRowId={(debt) => debt.alumno_id}
                  emptyTitle={texts.table.noResults}
                />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {selected ? (
        <div className="screen-only mt-8">
          <h2 className="mb-3 text-lg font-semibold">
            {texts.debts.collectionPanelFor(
              `${selected.nombre} ${selected.apellido}`,
            )}
          </h2>
          <Can permiso="cobranza.gestionar" rol={COLLECTION_MANAGE_ROLES}>
            <CollectionManagementPanel studentId={selected.alumno_id} />
          </Can>
        </div>
      ) : null}
    </PageFrame>
  )
}
