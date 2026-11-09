import { Badge } from '../../../shared/ui/badge'
import { statusLabel, statusTones } from '../utils/status'

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge tone={statusTones[status] ?? 'neutral'}>{statusLabel(status)}</Badge>
  )
}
