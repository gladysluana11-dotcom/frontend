import type { ReactNode } from 'react'

type FieldProps = {
  label: string
  htmlFor: string
  error?: string | undefined
  help?: string | undefined
  children: ReactNode
}

/** Etiqueta, ayuda y mensaje de error alrededor de un control (Input, Select, etc.). */
export function Field({ label, htmlFor, error, help, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
      {help && !error ? (
        <p className="text-xs text-muted-foreground">{help}</p>
      ) : null}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          className="text-sm text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
