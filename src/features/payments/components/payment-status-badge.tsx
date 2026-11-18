import { Badge } from '../../../shared/ui/badge'
import { texts } from '../../../shared/texts'

const tones: Record<string, 'success' | 'warning' | 'danger' | 'neutral'> = {
  vigente: 'success',
  pagada: 'success',
  parcial: 'warning',
  pendiente: 'neutral',
  vencida: 'danger',
  anulado: 'danger',
  anulada: 'danger',
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={tones[status] ?? 'neutral'}>
      {texts.payments.statusLabels[status] ?? status}
    </Badge>
  )
}
