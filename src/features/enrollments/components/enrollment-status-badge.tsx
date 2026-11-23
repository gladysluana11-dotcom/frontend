import { Badge } from '../../../shared/ui/badge'
import { texts } from '../../../shared/texts'

const tones: Record<
  string,
  'neutral' | 'success' | 'warning' | 'danger' | 'info'
> = {
  pre_inscrito: 'info',
  pendiente_documentos: 'warning',
  matriculado: 'success',
  retirado: 'danger',
  anulado: 'neutral',
}

export function EnrollmentStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={tones[status] ?? 'neutral'}>
      {texts.enrollments.states[status] ?? status}
    </Badge>
  )
}
