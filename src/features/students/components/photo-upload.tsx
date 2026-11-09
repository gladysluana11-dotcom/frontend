import { useRef, useState, type FormEvent } from 'react'
import { toast } from 'sonner'
import { texts } from '../../../shared/texts'
import { Button } from '../../../shared/ui/button'
import { validatePhotoFile } from '../form-schemas'
import { useUploadStudentPhoto } from '../hooks/use-student-mutations'

export function PhotoUpload({ studentId }: { studentId: number }) {
  const t = texts.studentsForm
  const upload = useUploadStudentPhoto(studentId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const file = inputRef.current?.files?.[0]
    const problem = validatePhotoFile(file)
    setError(problem)
    if (problem || !file) return

    try {
      await upload.mutateAsync(file)
      toast.success(t.photoUploaded)
      if (inputRef.current) inputRef.current.value = ''
    } catch (uploadError) {
      const message =
        uploadError instanceof Error
          ? uploadError.message
          : texts.form.serverFallback
      setError(message)
      toast.error(message)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-4 space-y-2"
      aria-label={t.photoTitle}
    >
      <label htmlFor="student-photo" className="block text-sm font-medium">
        {t.photoChoose}
      </label>
      <input
        id="student-photo"
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="block w-full text-sm file:mr-3 file:rounded-md file:border file:bg-white file:px-3 file:py-2 file:text-sm"
        aria-describedby="student-photo-help"
        onChange={() => setError(null)}
      />
      <p id="student-photo-help" className="text-xs text-muted-foreground">
        {t.photoHelp}
      </p>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={upload.isPending}>
        {upload.isPending ? t.photoUploading : t.photoUpload}
      </Button>
    </form>
  )
}
