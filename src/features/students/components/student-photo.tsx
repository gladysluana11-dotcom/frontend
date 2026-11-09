import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import { texts } from '../../../shared/texts'
import { useStudentPhoto } from '../hooks/use-students'

type StudentPhotoProps = {
  studentId: number
  name: string
  hasPhoto: boolean
}

/** Pide la foto al endpoint autenticado y la muestra con una URL temporal que se libera al salir. */
export function StudentPhoto({ studentId, name, hasPhoto }: StudentPhotoProps) {
  const { data: blob } = useStudentPhoto(studentId, hasPhoto)
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!blob || typeof URL.createObjectURL !== 'function') return
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => {
      URL.revokeObjectURL(objectUrl)
      setUrl(null)
    }
  }, [blob])

  if (url) {
    return (
      <img
        src={url}
        alt={texts.students.photoAlt(name)}
        className="size-32 rounded-xl border object-cover"
      />
    )
  }

  return (
    <div
      className="flex size-32 flex-col items-center justify-center gap-1 rounded-xl border bg-muted text-muted-foreground"
      role="img"
      aria-label={texts.students.noPhoto}
    >
      <UserRound aria-hidden="true" className="size-10" />
      <span className="text-xs">{texts.students.noPhoto}</span>
    </div>
  )
}
