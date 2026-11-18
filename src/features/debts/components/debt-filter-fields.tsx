import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { Select } from '../../../shared/ui/select'
import { gradeLabel } from '../../catalog/api/catalog-api'
import {
  useAcademicYears,
  useGrades,
  useLevels,
  useSections,
} from '../../catalog/hooks/use-catalog'
import type { useTableState } from '../../../shared/hooks/use-table-state'

type TableStateHook = ReturnType<typeof useTableState>

const idFilters = [
  { key: 'nivel_id', label: texts.debts.filterLevel },
  { key: 'grado_id', label: texts.debts.filterGrade },
  { key: 'seccion_id', label: texts.debts.filterSection },
  { key: 'anio_escolar_id', label: texts.debts.filterYear },
] as const
const numericFilters = [
  { key: 'dias_atraso_min', label: texts.debts.filterDays, min: 1 },
  { key: 'monto_min', label: texts.debts.filterAmount, min: 0 },
] as const

export function DebtFilterFields({
  table,
  search,
  onSearchChange,
}: {
  table: TableStateHook
  search: string
  onSearchChange: (value: string) => void
}) {
  const years = useAcademicYears()
  const levels = useLevels()
  const grades = useGrades()
  const sections = useSections()
  const catalogError = [years, levels, grades, sections].find(
    (query) => query.isError,
  )?.error
  const options = {
    nivel_id: (levels.data ?? []).map((item) => ({
      id: item.id,
      label: item.nombre,
    })),
    grado_id: (grades.data ?? []).map((item) => ({
      id: item.id,
      label: gradeLabel(item, levels.data ?? []),
    })),
    seccion_id: (sections.data ?? []).map((item) => ({
      id: item.id,
      label: item.nombre,
    })),
    anio_escolar_id: (years.data ?? []).map((item) => ({
      id: item.id,
      label: item.nombre,
    })),
  }

  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Field
        label={texts.debts.search}
        htmlFor="debt-search"
        help={texts.debts.searchPlaceholder}
      >
        <Input
          id="debt-search"
          value={search}
          autoComplete="off"
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </Field>
      {idFilters.map(({ key, label }) => (
        <Field key={key} label={label} htmlFor={`debt-${key}`}>
          <Select
            id={`debt-${key}`}
            value={table.state.filters[key] ?? ''}
            onChange={(event) =>
              table.setFilter(key, event.target.value || undefined)
            }
          >
            <option value="">Todos</option>
            {options[key].map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </Select>
        </Field>
      ))}
      {numericFilters.map(({ key, label, min }) => (
        <Field key={key} label={label} htmlFor={`debt-${key}`}>
          <Input
            id={`debt-${key}`}
            type="number"
            min={min}
            step={key === 'monto_min' ? '0.01' : '1'}
            inputMode="numeric"
            value={table.state.filters[key] ?? ''}
            onChange={(event) =>
              table.setFilter(key, event.target.value || undefined)
            }
          />
        </Field>
      ))}
      {catalogError ? (
        <p className="text-sm text-destructive sm:col-span-2" role="alert">
          {catalogError.message}
        </p>
      ) : null}
      <div className="flex items-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            table.clearFilters()
            onSearchChange('')
          }}
        >
          {texts.debts.clearFilters}
        </Button>
      </div>
    </div>
  )
}
