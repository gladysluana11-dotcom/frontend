import type { InputHTMLAttributes, ReactNode } from 'react'
import { Input } from '../../../shared/ui/input'

type FormFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string | undefined
  trailing?: ReactNode
}

export function FormField({
  label,
  error,
  id,
  trailing,
  ...inputProps
}: FormFieldProps) {
  const inputId = id ?? inputProps.name
  const errorId = `${inputId}-error`

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label className="text-sm font-medium" htmlFor={inputId}>
          {label}
        </label>
        {trailing}
      </div>
      <Input
        id={inputId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        {...inputProps}
      />
      {error ? (
        <p id={errorId} className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  )
}
