import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { ApiError } from '../../../shared/api/errors'
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value'
import { useTableState } from '../../../shared/hooks/use-table-state'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Can } from '../../../shared/ui/can'
import { DataTable, type Column } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { PageFrame } from '../../../shared/ui/page-frame'
import { Select } from '../../../shared/ui/select'
import { StatusState } from '../../../shared/ui/status-state'
import { formatDate } from '../../../shared/utils/format'
import { gradeLabel } from '../../catalog/api/catalog-api'
import {
  useAcademicYears,
  useGrades,
  useLevels,
  useSections,
} from '../../catalog/hooks/use-catalog'
import { useEnrollments } from '../hooks/use-enrollments'
import { ENROLLMENT_MANAGE_ROLES } from '../roles'
import { ENROLLMENT_STATUSES, type EnrollmentListItem } from '../schemas'
import { EnrollmentStatusBadge } from '../components/enrollment-status-badge'

const FILTER_KEYS = [
  'anio_escolar_id',
  'grado_id',
  'seccion_id',
  'estado',
] as const

export default function EnrollmentsPage() {
  const navigate = useNavigate()
  const table = useTableState(FILTER_KEYS)
  const { state } = table
  const years = useAcademicYears()
  const levels = useLevels()
  const grades = useGrades()
  const sections = useSections()
  const enrollments = useEnrollments({
    page: state.page,
    perPage: state.perPage,
    search: state.search,
    sort: state.sort,
    direction: state.direction,
    academicYearId: state.filters.anio_escolar_id,
    gradeId: state.filters.grado_id,
    sectionId: state.filters.seccion_id,
    status: state.filters.estado,
  })

  const [searchInput, setSearchInput] = useState(state.search)
  const debouncedSearch = useDebouncedValue(searchInput, 400)
  const appliedSearch = useRef(state.search)
  const { setSearch } = table

  useEffect(() => {
    const value = debouncedSearch.trim()
    if (value !== appliedSearch.current) {
      appliedSearch.current = value
      setSearch(value)
    }
  }, [debouncedSearch, setSearch])

  useEffect(() => {
    appliedSearch.current = state.search
    setSearchInput(state.search)
  }, [state.search])

  const gradeOptions = useMemo(
    () =>
      (grades.data ?? []).map((grade) => ({
        id: grade.id,
        label: gradeLabel(grade, levels.data ?? []),
      })),
    [grades.data, levels.data],
  )
  const sectionOptions = (sections.data ?? []).filter(
    (section) =>
      (!state.filters.grado_id ||
        section.grado_id === Number(state.filters.grado_id)) &&
      (!state.filters.anio_escolar_id ||
        section.anio_escolar_id === Number(state.filters.anio_escolar_id)),
  )
  const hasFilters =
    Boolean(state.search) || Object.keys(state.filters).length > 0

  const columns: Column<EnrollmentListItem>[] = [
    {
      id: 'student',
      header: texts.enrollments.columnStudent,
      cell: (enrollment) => (
        <Link
          to={`/matriculas/${enrollment.id}`}
          className="font-medium text-[var(--school-primary)] hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {enrollment.alumno.apellido}, {enrollment.alumno.nombre}
        </Link>
      ),
    },
    {
      id: 'year',
      header: texts.enrollments.columnYear,
      sortKey: 'anio_escolar_id',
      cell: (enrollment) => enrollment.anio_escolar ?? '—',
    },
    {
      id: 'grade-section',
      header: texts.enrollments.columnGradeSection,
      sortKey: 'grado_id',
      cell: (enrollment) =>
        `${enrollment.grado ?? ''} ${enrollment.seccion ?? ''}`.trim() || '—',
    },
    {
      id: 'date',
      header: texts.enrollments.columnDate,
      sortKey: 'fecha_matricula',
      cell: (enrollment) => formatDate(enrollment.fecha_matricula),
    },
    {
      id: 'status',
      header: texts.enrollments.columnStatus,
      sortKey: 'estado',
      cell: (enrollment) => (
        <EnrollmentStatusBadge status={enrollment.estado} />
      ),
    },
  ]

  if (
    enrollments.error instanceof ApiError &&
    enrollments.error.status === 403
  ) {
    return (
      <PageFrame title={texts.navigation.forbiddenTitle}>
        <StatusState
          state="error"
          title={texts.navigation.forbiddenTitle}
          message={texts.enrollments.forbidden}
        />
      </PageFrame>
    )
  }

  return (
    <PageFrame
      eyebrow={texts.navigation.enrollments}
      title={texts.enrollments.title}
      description={texts.enrollments.description}
    >
      <Can rol={ENROLLMENT_MANAGE_ROLES}>
        <div className="mb-4 flex justify-end">
          <Button asChild>
            <Link to="/matriculas/nueva">{texts.enrollments.newButton}</Link>
          </Button>
        </div>
      </Can>

      <form
        className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5"
        role="search"
        onSubmit={(event) => event.preventDefault()}
      >
        <label className="block sm:col-span-2 lg:col-span-1">
          <span className="mb-1 block text-sm font-medium">
            {texts.enrollments.search}
          </span>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
            />
            <Input
              type="search"
              className="pl-9"
              placeholder={texts.enrollments.searchPlaceholder}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.enrollments.year}
          </span>
          <Select
            value={state.filters.anio_escolar_id ?? ''}
            onChange={(event) =>
              table.setFilters({
                anio_escolar_id: event.target.value || undefined,
                seccion_id: undefined,
              })
            }
          >
            <option value="">{texts.enrollments.allYears}</option>
            {(years.data ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.nombre}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.enrollments.grade}
          </span>
          <Select
            value={state.filters.grado_id ?? ''}
            onChange={(event) =>
              table.setFilters({
                grado_id: event.target.value || undefined,
                seccion_id: undefined,
              })
            }
          >
            <option value="">{texts.enrollments.allGrades}</option>
            {gradeOptions.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.enrollments.section}
          </span>
          <Select
            value={state.filters.seccion_id ?? ''}
            disabled={!state.filters.grado_id}
            onChange={(event) =>
              table.setFilter('seccion_id', event.target.value || undefined)
            }
          >
            <option value="">{texts.enrollments.allSections}</option>
            {sectionOptions.map((section) => (
              <option key={section.id} value={section.id}>
                {section.nombre}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.enrollments.status}
          </span>
          <Select
            value={state.filters.estado ?? ''}
            onChange={(event) =>
              table.setFilter('estado', event.target.value || undefined)
            }
          >
            <option value="">{texts.enrollments.allStatuses}</option>
            {ENROLLMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {texts.enrollments.states[status]}
              </option>
            ))}
          </Select>
        </label>
      </form>

      {hasFilters ? (
        <div className="mb-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={table.clearFilters}
          >
            {texts.table.clearFilters}
          </Button>
        </div>
      ) : null}
      <DataTable
        caption={texts.enrollments.listCaption}
        columns={columns}
        rows={enrollments.data?.items ?? []}
        getRowId={(enrollment) => enrollment.id}
        isLoading={enrollments.isPending}
        isFetching={enrollments.isFetching}
        error={enrollments.error}
        onRetry={() => void enrollments.refetch()}
        pagination={enrollments.data?.pagination}
        onPageChange={table.setPage}
        onPerPageChange={table.setPerPage}
        sort={{ key: state.sort, direction: state.direction }}
        onSortChange={(key, direction) => table.setSort(key, direction)}
        onRowClick={(enrollment) =>
          void navigate(`/matriculas/${enrollment.id}`)
        }
        emptyTitle={texts.table.noResults}
        emptyMessage={
          hasFilters ? texts.table.clearFilters : texts.states.noInformation
        }
      />
    </PageFrame>
  )
}
