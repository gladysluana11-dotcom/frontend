import { texts } from '../../../shared/texts'
import type { StudentHistory } from '../schemas'
import { statusLabel } from './status'

export type TimelineItem = {
  key: string
  date: string
  title: string
  reason: string | null
}

/** Une los cambios de estado del alumno y los eventos de matrícula, del más reciente al más antiguo. */
export function buildTimeline(history: StudentHistory): TimelineItem[] {
  const statusItems = history.cambios_estado.map((change, index) => ({
    key: `status-${index}`,
    date: change.fecha ?? '',
    title: texts.students.statusChange(
      statusLabel(change.estado_nuevo ?? '—'),
      change.estado_anterior ? statusLabel(change.estado_anterior) : null,
    ),
    reason: change.motivo ?? null,
  }))

  const enrollmentItems = history.cambios_matricula.map((change, index) => {
    const event = change.evento ?? 'actualizada'
    return {
      key: `enrollment-${index}`,
      date: change.fecha ?? '',
      title: texts.students.enrollmentEvent(
        texts.students.eventLabels[event] ?? event.replaceAll('_', ' '),
        change.estado_nuevo ? statusLabel(change.estado_nuevo) : null,
      ),
      reason: change.motivo ?? null,
    }
  })

  return [...statusItems, ...enrollmentItems].sort((a, b) =>
    b.date.localeCompare(a.date),
  )
}
