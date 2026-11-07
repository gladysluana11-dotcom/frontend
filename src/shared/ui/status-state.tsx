import { AlertCircle, LoaderCircle } from 'lucide-react'
import { texts } from '../texts'
import { Button } from './button'

type StatusStateProps = {
  state: 'loading' | 'empty' | 'error'
  title?: string
  message?: string
  onRetry?: () => void
}

export function StatusState({
  state,
  title,
  message,
  onRetry,
}: StatusStateProps) {
  if (state === 'loading') {
    return (
      <div
        className="flex min-h-40 flex-col items-center justify-center gap-3 text-muted-foreground"
        role="status"
      >
        <LoaderCircle aria-hidden="true" className="size-6 animate-spin" />
        <span>{message ?? texts.states.loading}</span>
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center">
        <p className="font-medium">
          {title ?? texts.states.noInformationTitle}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {message ?? texts.states.noInformation}
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-8 text-center"
      role="alert"
    >
      <AlertCircle aria-hidden="true" className="size-6 text-destructive" />
      <div>
        <p className="font-medium">{title ?? texts.states.loadErrorTitle}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {message ?? texts.states.tryAgain}
        </p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          {texts.retry}
        </Button>
      ) : null}
    </div>
  )
}
