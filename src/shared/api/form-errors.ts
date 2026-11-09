import type { FieldPath, FieldValues, UseFormSetError } from 'react-hook-form'
import { ApiError } from './errors'

/**
 * Copia los errores de validación que devuelve la API (422) a los campos del formulario.
 * Devuelve true si al menos un error se pudo mostrar junto a su campo.
 */
export function applyServerErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  error: unknown,
  fieldNames: readonly string[],
): boolean {
  if (!(error instanceof ApiError)) return false

  let applied = false
  for (const [field, messages] of Object.entries(error.errors)) {
    const message = messages[0]
    if (message && fieldNames.includes(field)) {
      setError(field as FieldPath<T>, { type: 'server', message })
      applied = true
    }
  }
  return applied
}
