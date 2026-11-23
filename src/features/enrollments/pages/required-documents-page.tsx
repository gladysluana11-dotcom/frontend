import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { ApiError } from '../../../shared/api/errors'
import { applyServerErrors } from '../../../shared/api/form-errors'
import { texts } from '../../../shared/texts'
import { Badge } from '../../../shared/ui/badge'
import { Button } from '../../../shared/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { Field } from '../../../shared/ui/field'
import { Input } from '../../../shared/ui/input'
import { PageFrame } from '../../../shared/ui/page-frame'
import { StatusState } from '../../../shared/ui/status-state'
import {
  useRequiredDocumentMutations,
  useRequiredDocuments,
} from '../hooks/use-enrollments'
import {
  requiredDocumentFormSchema,
  type RequiredDocument,
  type RequiredDocumentFormValues,
} from '../schemas'

const REQUIRED_DOC_FIELDS = ['nombre', 'obligatorio', 'activo']

export default function RequiredDocumentsPage() {
  const t = texts.enrollments
  const documents = useRequiredDocuments()
  const mutations = useRequiredDocumentMutations()
  const [editing, setEditing] = useState<RequiredDocument>()
  const [formOpen, setFormOpen] = useState(false)
  const form = useForm<RequiredDocumentFormValues>({
    resolver: zodResolver(requiredDocumentFormSchema),
    defaultValues: { nombre: '', obligatorio: false, activo: true },
  })

  useEffect(() => {
    form.reset(
      editing
        ? {
            nombre: editing.nombre,
            obligatorio: editing.obligatorio,
            activo: editing.activo,
          }
        : { nombre: '', obligatorio: false, activo: true },
    )
  }, [editing, form])

  const openNew = () => {
    setEditing(undefined)
    setFormOpen(true)
  }
  const openEdit = (document: RequiredDocument) => {
    setEditing(document)
    setFormOpen(true)
  }

  const submit = form.handleSubmit(async (values) => {
    try {
      if (editing) {
        await mutations.update.mutateAsync({ id: editing.id, values })
        toast.success(t.documentUpdatedConfig)
      } else {
        await mutations.create.mutateAsync(values)
        toast.success(t.documentSaved)
      }
      setFormOpen(false)
      setEditing(undefined)
    } catch (error) {
      const applied = applyServerErrors(
        form.setError,
        error,
        REQUIRED_DOC_FIELDS,
      )
      form.setError('root.server', {
        message:
          error instanceof ApiError && error.status === 403
            ? t.serverForbidden
            : applied
              ? t.enrollmentError
              : error instanceof Error
                ? error.message
                : t.enrollmentError,
      })
    }
  })

  return (
    <PageFrame
      eyebrow={texts.navigation.requiredDocuments}
      title={t.requiredDocsTitle}
      description={t.requiredDocsDescription}
    >
      <div className="mb-4 flex justify-end">
        <Button type="button" onClick={openNew}>
          {t.addDocument}
        </Button>
      </div>
      {formOpen ? (
        <form
          className="mb-5 max-w-xl space-y-4 rounded-xl border bg-white p-5"
          aria-label={editing ? t.editDocument : t.addDocument}
          noValidate
          onSubmit={submit}
        >
          <h2 className="font-semibold">
            {editing ? t.editDocument : t.addDocument}
          </h2>
          <Field
            label={t.documentName}
            htmlFor="required-document-name"
            error={form.formState.errors.nombre?.message}
          >
            <Input id="required-document-name" {...form.register('nombre')} />
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('obligatorio')} />
            {t.mandatory}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" {...form.register('activo')} />
            {t.active}
          </label>
          {form.formState.errors.root?.server?.message ? (
            <p className="text-sm text-destructive" role="alert">
              {form.formState.errors.root.server.message}
            </p>
          ) : null}
          <div className="flex gap-2">
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? texts.form.saving : t.saveDocument}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={form.formState.isSubmitting}
              onClick={() => {
                setFormOpen(false)
                setEditing(undefined)
              }}
            >
              {texts.form.cancel}
            </Button>
          </div>
        </form>
      ) : null}

      {documents.isPending ? (
        <StatusState state="loading" />
      ) : documents.isError ? (
        <StatusState
          state="error"
          message={
            documents.error instanceof ApiError &&
            documents.error.status === 403
              ? t.serverForbidden
              : documents.error.message
          }
          onRetry={() => void documents.refetch()}
        />
      ) : documents.data.length === 0 ? (
        <StatusState state="empty" message={t.noRequiredDocs} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {documents.data.map((document) => (
            <Card key={document.id}>
              <CardHeader>
                <CardTitle className="text-base">{document.nombre}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Badge tone={document.obligatorio ? 'warning' : 'neutral'}>
                  {document.obligatorio ? t.mandatory : t.optional}
                </Badge>
                <Badge tone={document.activo ? 'success' : 'neutral'}>
                  {document.activo ? t.active : t.inactive}
                </Badge>
                <Button
                  className="ml-auto"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openEdit(document)}
                >
                  {t.editDocument}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageFrame>
  )
}
