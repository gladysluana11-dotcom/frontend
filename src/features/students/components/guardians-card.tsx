import { useState } from 'react'
import { texts } from '../../../shared/texts'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import type { Guardian } from '../schemas'
import { LinkGuardianForm, NewGuardianForm } from './guardian-forms'

type GuardiansCardProps = {
  studentId: number
  guardians: Guardian[] | undefined
  canEdit: boolean
}

type Mode = 'new' | 'link' | null

export function GuardiansCard({
  studentId,
  guardians,
  canEdit,
}: GuardiansCardProps) {
  const t = texts.studentsForm
  const [mode, setMode] = useState<Mode>(null)
  const close = () => setMode(null)

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="text-base">{t.guardians}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {guardians === undefined ? (
          <p className="text-sm text-muted-foreground">{t.guardiansPending}</p>
        ) : guardians.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {texts.students.notProvided}
          </p>
        ) : (
          <ul className="divide-y">
            {guardians.map((guardian) => (
              <li
                key={guardian.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm"
              >
                <span className="font-medium">
                  {guardian.apellido}, {guardian.nombre}
                </span>
                {guardian.parentesco ? (
                  <span className="text-muted-foreground">
                    {guardian.parentesco}
                  </span>
                ) : null}
                {guardian.telefono ? (
                  <span className="text-muted-foreground">
                    {guardian.telefono}
                  </span>
                ) : null}
                {guardian.responsable_pago ? (
                  <Badge tone="info">{t.guardianPaymentBadge}</Badge>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canEdit ? (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={mode === 'new'}
                onClick={() => setMode(mode === 'new' ? null : 'new')}
              >
                {t.guardianAdd}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={mode === 'link'}
                onClick={() => setMode(mode === 'link' ? null : 'link')}
              >
                {t.guardianLink}
              </Button>
            </div>
            {mode === 'new' ? (
              <NewGuardianForm studentId={studentId} onDone={close} />
            ) : null}
            {mode === 'link' ? (
              <LinkGuardianForm studentId={studentId} onDone={close} />
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
