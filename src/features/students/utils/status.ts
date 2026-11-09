import { texts } from '../../../shared/texts'

export type StatusTone = 'neutral' | 'success' | 'warning' | 'danger' | 'info'

export const statusTones: Record<string, StatusTone> = {
  activo: 'success',
  matriculado: 'success',
  egresado: 'info',
  pre_inscrito: 'warning',
  pendiente_documentos: 'warning',
  retirado: 'danger',
  anulado: 'danger',
}

export function statusLabel(status: string): string {
  return texts.students.statusLabels[status] ?? status.replaceAll('_', ' ')
}
