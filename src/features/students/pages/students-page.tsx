import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { useDebouncedValue } from '../../../shared/hooks/use-debounced-value'
import { useTableState } from '../../../shared/hooks/use-table-state'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Can } from '../../../shared/ui/can'
import { DataTable, type Column } from '../../../shared/ui/data-table'
import { Input } from '../../../shared/ui/input'
import { PageFrame } from '../../../shared/ui/page-frame'
import { Select } from '../../../shared/ui/select'
import { gradeLabel } from '../../catalog/api/catalog-api'
import {
  useAcademicYears,
  useGrades,
  useLevels,
  useSections,
} from '../../catalog/hooks/use-catalog'
import { STUDENT_STATUSES } from '../api/students-api'
import { STUDENT_WRITE_ROLES } from '../roles'
import { StatusBadge } from '../components/status-badge'
import { statusLabel } from '../utils/status'
import { useStudents } from '../hooks/use-students'
import type { StudentListItem } from '../schemas'

const FILTER_KEYS = [
  'estado',
  'anio_escolar_id',
  'grado_id',
  'seccion_id',
] as const

export default function StudentsPage() {
  const navigate = useNavigate()
  const table = useTableState(FILTER_KEYS)
  const { state } = table

  const years = useAcademicYears()
  const levels = useLevels()
  const grades = useGrades()
  const sections = useSections()

  const students = useStudents({
    page: state.page,
    perPage: state.perPage,
    search: state.search,
    sort: state.sort,
    direction: state.direction,
    status: state.filters.estado,
    academicYearId: state.filters.anio_escolar_id,
    gradeId: state.filters.grado_id,
    sectionId: state.filters.seccion_id,
  })

  // La búsqueda se escribe en un campo local y se envía a la URL cuando el usuario deja de teclear.
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

  const sectionOptions = useMemo(() => {
    const gradeId = Number(state.filters.grado_id)
    const yearId = Number(state.filters.anio_escolar_id)
    return (sections.data ?? []).filter(
      (section) =>
        section.grado_id === gradeId &&
        (!yearId || section.anio_escolar_id === yearId),
    )
  }, [sections.data, state.filters.grado_id, state.filters.anio_escolar_id])

  const hasFilters =
    Boolean(state.search) || Object.keys(state.filters).length > 0

  const columns: Column<StudentListItem>[] = [
    {
      id: 'name',
      header: texts.students.columnName,
      sortKey: 'apellido',
      cell: (student) => (
        <Link
          to={`/alumnos/${student.id}`}
          className="font-medium text-[var(--school-primary)] hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          {student.apellido}, {student.nombre}
        </Link>
      ),
    },
    {
      id: 'document',
      header: texts.students.columnDocument,
      hideBelow: 'md',
      cell: (student) => student.documento ?? '—',
    },
    {
      id: 'grade',
      header: texts.students.columnGrade,
      cell: (student) => {
        const enrollment = student.matricula_actual
        return enrollment?.grado
          ? `${enrollment.grado} ${enrollment.seccion ?? ''}`.trim()
          : texts.students.noEnrollment
      },
    },
    {
      id: 'status',
      header: texts.students.columnStatus,
      sortKey: 'estado',
      cell: (student) => <StatusBadge status={student.estado} />,
    },
    {
      id: 'enrollment',
      header: texts.students.columnEnrollment,
      hideBelow: 'lg',
      cell: (student) =>
        student.matricula_actual?.estado ? (
          <StatusBadge status={student.matricula_actual.estado} />
        ) : (
          '—'
        ),
    },
  ]

  return (
    <PageFrame
      eyebrow={texts.navigation.students}
      title={texts.students.title}
      description={texts.students.description}
    >
      <Can rol={STUDENT_WRITE_ROLES}>
        <div className="mb-4 flex justify-end">
          <Button asChild>
            <Link to="/alumnos/nuevo">{texts.studentsForm.newButton}</Link>
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
            {texts.students.searchLabel}
          </span>
          <div className="relative">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground"
            />
            <Input
              type="search"
              className="pl-9"
              placeholder={texts.students.searchPlaceholder}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.students.filterStatus}
          </span>
          <Select
            value={state.filters.estado ?? ''}
            onChange={(event) =>
              table.setFilter('estado', event.target.value || undefined)
            }
          >
            <option value="">{texts.students.allStatuses}</option>
            {STUDENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {statusLabel(status)}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.students.filterYear}
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
            <option value="">{texts.students.allYears}</option>
            {(years.data ?? []).map((year) => (
              <option key={year.id} value={year.id}>
                {year.nombre}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.students.filterGrade}
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
            <option value="">{texts.students.allGrades}</option>
            {gradeOptions.map((grade) => (
              <option key={grade.id} value={grade.id}>
                {grade.label}
              </option>
            ))}
          </Select>
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium">
            {texts.students.filterSection}
          </span>
          <Select
            value={state.filters.seccion_id ?? ''}
            disabled={!state.filters.grado_id}
            onChange={(event) =>
              table.setFilter('seccion_id', event.target.value || undefined)
            }
          >
            <option value="">
              {state.filters.grado_id
                ? texts.students.allSections
                : texts.students.chooseGradeFirst}
            </option>
            {sectionOptions.map((section) => (
              <option key={section.id} value={section.id}>
                {section.nombre}
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
        caption={texts.students.listCaption}
        columns={columns}
        rows={students.data?.items ?? []}
        getRowId={(student) => student.id}
        isLoading={students.isPending}
        isFetching={students.isFetching}
        error={students.error}
        onRetry={() => void students.refetch()}
        pagination={students.data?.pagination}
        onPageChange={table.setPage}
        onPerPageChange={table.setPerPage}
        sort={{ key: state.sort, direction: state.direction }}
        onSortChange={(key, direction) => table.setSort(key, direction)}
        onRowClick={(student) => void navigate(`/alumnos/${student.id}`)}
        emptyTitle={
          hasFilters ? texts.table.noResults : texts.students.emptyTitle
        }
        emptyMessage={
          hasFilters ? texts.table.clearFilters : texts.students.emptyMessage
        }
      />
    </PageFrame>
  )
}
