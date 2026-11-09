import { texts } from '../../../shared/texts'
import { formatDate } from '../../../shared/utils/format'
import type { StudentHistory } from '../schemas'
import { buildTimeline } from '../utils/timeline'

export function HistoryTimeline({ history }: { history: StudentHistory }) {
  const items = buildTimeline(history)

  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {texts.students.noHistory}
      </p>
    )
  }

  return (
    <ol className="space-y-4 border-l pl-5">
      {items.map((item) => (
        <li key={item.key} className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-[26px] top-1.5 size-2.5 rounded-full bg-[var(--school-primary)]"
          />
          <p className="text-sm font-medium">{item.title}</p>
          <p className="text-xs text-muted-foreground">
            {item.date ? formatDate(item.date) : ''}
          </p>
          {item.reason ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {texts.students.reason}: {item.reason}
            </p>
          ) : null}
        </li>
      ))}
    </ol>
  )
}
