import type { ReactNode } from 'react'
import { usePermisos } from '../hooks/use-permisos'

type CanProps = {
  permiso: string | string[]
  modo?: 'alguno' | 'todos'
  children: ReactNode
  fallback?: ReactNode
}

export function Can({
  permiso,
  modo = 'alguno',
  children,
  fallback = null,
}: CanProps) {
  const permissions = usePermisos()
  const required = Array.isArray(permiso) ? permiso : [permiso]
  const allowed =
    modo === 'todos'
      ? permissions.tieneTodosLosPermisos(required)
      : permissions.tieneAlgunPermiso(required)

  return allowed ? children : fallback
}
