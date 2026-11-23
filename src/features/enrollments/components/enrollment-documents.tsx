import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { dateInputToday, formatDate } from '../../../shared/utils/format'
import {
  enrollmentDocumentUpdateSchema,
  type EnrollmentDocument,
} from '../schemas'

type EnrollmentDocumentsProps = {
  documents: EnrollmentDocument[]
  isUpdating: boolean
  onUpdate: (
    document: EnrollmentDocument,
    status: 'pendiente' | 'entregado',
    date?: string,
  ) => Promise<void>
}

export function EnrollmentDocuments({
  documents,
  isUpdating,
  onUpdate,
}: EnrollmentDocumentsProps) {
  if (documents.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {texts.enrollments.noDocuments}
      </p>
    )
  }

  return (
    <ul className="divide-y">
      {documents.map((document) => (
        <EnrollmentDocumentRow
          key={document.id}
          document={document}
          disabled={isUpdating}
          onUpdate={onUpdate}
        />
      ))}
    </ul>
  )
}

function EnrollmentDocumentRow({
  document,
  disabled,
  onUpdate,
}: {
  document: EnrollmentDocument
  disabled: boolean
  onUpdate: EnrollmentDocumentsProps['onUpdate']
}) {
  const [date, setDate] = useState(dateInputToday())
  const [error, setError] = useState('')

  const delivered = async () => {
    const parsed = enrollmentDocumentUpdateSchema.safeParse({
      estado: 'entregado',
      fecha_entrega: date,
    })
    if (!parsed.success) {
      setError(
        parsed.error.issues[0]?.message ?? texts.enrollments.fieldErrors.date,
      )
      return
    }
    try {
      await onUpdate(document, 'entregado', date)
      setError('')
    } catch (reason) {
      toast.error(
        reason instanceof ApiError && reason.status === 403
          ? texts.enrollments.serverForbidden
          : reason instanceof Error
            ? reason.message
            : texts.enrollments.enrollmentError,
      )
    }
  }

  const pending = async () => {
    try {
      await onUpdate(document, 'pendiente')
      setError('')
    } catch (reason) {
      toast.error(
        reason instanceof ApiError && reason.status === 403
          ? texts.enrollments.serverForbidden
          : reason instanceof Error
            ? reason.message
            : texts.enrollments.enrollmentError,
      )
    }
  }

  return (
    <li className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">{document.nombre}</p>
        <p className="text-sm text-muted-foreground">
          {document.estado === 'entregado'
            ? `${texts.enrollments.documentDelivered} · ${document.fecha_entrega ? formatDate(document.fecha_entrega) : '—'}`
            : texts.enrollments.documentPending}
        </p>
      </div>
      {document.estado === 'pendiente' ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field
            label={texts.enrollments.deliveryDate}
            htmlFor={`fecha-entrega-${document.id}`}
            error={error}
          >
            <Input
              id={`fecha-entrega-${document.id}`}
              type="date"
              max={dateInputToday()}
              value={date}
              onChange={(event) => setDate(event.target.value)}
              disabled={disabled}
              className="w-auto"
            />
          </Field>
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            onClick={() => void delivered()}
          >
            {texts.enrollments.delivered}
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={disabled}
          onClick={() => void pending()}
        >
          {texts.enrollments.pending}
        </Button>
      )}
    </li>
  )
}
