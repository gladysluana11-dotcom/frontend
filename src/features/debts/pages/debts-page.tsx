import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Column } from '../../../shared/ui/data-table'
import { DataTable } from '../../../shared/ui/data-table'
import { PageFrame } from '../../../shared/ui/page-frame'
import { useTableState } from '../../../shared/hooks/use-table-state'
import { texts } from '../../../shared/texts'
import { Can } from '../../../shared/ui/can'
import { Button } from '../../../shared/ui/button'
import { formatSoles } from '../../../shared/utils/format'
import { PAYMENT_VIEW_ROLES } from '../../payments/roles'
import { COLLECTION_MANAGE_ROLES } from '../roles'
import { useDebts } from '../hooks/use-debts'
import { usePrivateStudentSearch } from '../hooks/use-private-student-search'
import { CollectionManagementPanel } from '../components/collection-management-panel'
import { DebtFilterFields } from '../components/debt-filter-fields'
import { debtParamsFromState } from '../utils'
import type { Debt } from '../schemas'

const FILTER_KEYS = [
  'nivel_id',
  'grado_id',
  'seccion_id',
  'anio_escolar_id',
  'dias_atraso_min',
  'monto_min',
] as const

export default function DebtsPage() {
  const table = useTableState(FILTER_KEYS)
  const search = usePrivateStudentSearch()
  const params = useMemo(
    () => debtParamsFromState(table.state, search.debouncedSearch),
    [table.state, search.debouncedSearch],
  )
  const debts = useDebts(params)
  const [selected, setSelected] = useState<Debt>()

  const columns: Column<Debt>[] = [
    {
      id: 'student',
      header: texts.debts.name,
      sortKey: 'nombre',
      cell: (debt) => (
        <div>
          <p className="font-medium">
            {debt.apellido}, {debt.nombre}
          </p>
          <p className="text-xs text-muted-foreground">
            {[debt.nivel, debt.grado, debt.seccion]
              .filter(Boolean)
              .join(' · ') || '—'}
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
      sortKey: 'total_vencido',
      cell: (debt) => formatSoles(debt.total_vencido),
    },
    {
      id: 'pending',
      header: texts.debts.pendingAmount,
      sortKey: 'total_pendiente',
      cell: (debt) => formatSoles(debt.total_pendiente),
    },
    {
      id: 'installments',
      header: texts.debts.overdueInstallments,
      sortKey: 'cuotas_vencidas',
      cell: (debt) => debt.cuotas_vencidas,
    },
    {
      id: 'delay',
      header: texts.debts.overdueDays,
      sortKey: 'dias_atraso',
      cell: (debt) => debt.dias_atraso,
    },
    {
      id: 'responsible',
      header: texts.debts.responsible,
      cell: (debt) =>
        debt.apoderado_responsable_pago ? (
          <div>
            <p>
              {debt.apoderado_responsable_pago.apellido},{' '}
              {debt.apoderado_responsable_pago.nombre}
            </p>
            {debt.apoderado_responsable_pago.telefono ? (
              <p>{debt.apoderado_responsable_pago.telefono}</p>
            ) : null}
            {debt.apoderado_responsable_pago.email ? (
              <p>{debt.apoderado_responsable_pago.email}</p>
            ) : null}
            {!debt.apoderado_responsable_pago.telefono &&
            !debt.apoderado_responsable_pago.email ? (
              <p>{texts.debts.noContact}</p>
            ) : null}
          </div>
        ) : (
          texts.debts.noResponsible
        ),
    },
    {
      id: 'actions',
      header: texts.debts.manageCollections,
      cell: (debt) => (
        <Can permiso="cobranza.gestionar" rol={COLLECTION_MANAGE_ROLES}>
          <Button
            type="button"
            variant="outline"
            size="sm"
            aria-expanded={selected?.alumno_id === debt.alumno_id}
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

  return (
    <PageFrame
      eyebrow={texts.debts.title}
      title={texts.debts.title}
      description={texts.debts.description}
    >
      <DebtFilterFields
        table={table}
        search={search.search}
        onSearchChange={search.setSearch}
      />
      <DataTable
        caption={texts.debts.table}
        columns={columns}
        rows={debts.data?.items ?? []}
        getRowId={(debt) => debt.alumno_id}
        isLoading={debts.isPending}
        isFetching={debts.isFetching}
        error={debts.error}
        onRetry={() => void debts.refetch()}
        pagination={debts.data?.pagination}
        onPageChange={table.setPage}
        onPerPageChange={table.setPerPage}
        sort={{ key: table.state.sort, direction: table.state.direction }}
        onSortChange={table.setSort}
        emptyTitle={texts.table.noResults}
      />
      {selected ? (
        <div className="mt-8">
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
