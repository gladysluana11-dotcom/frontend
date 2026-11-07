import type { ReactNode } from 'react'
import { usePermisos } from '../hooks/use-permisos'

type CanProps = {
  /** Permiso (o lista de permisos) requerido. */
  permiso?: string | string[]
  /** Rol (o lista de roles) permitido, por ejemplo "director" o ["director", "tesoreria"]. */
  rol?: string | string[]
  modo?: 'alguno' | 'todos'
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Muestra el contenido si el usuario cumple el permiso o tiene alguno de los roles indicados.
 * Es solo una ayuda visual: la autorización real la aplica el backend.
 */
export function Can({
  permiso,
  rol,
  modo = 'alguno',
  children,
  fallback = null,
}: CanProps) {
  const permissions = usePermisos()
  const requiredPermissions =
    permiso === undefined ? [] : Array.isArray(permiso) ? permiso : [permiso]
  const requiredRoles =
    rol === undefined ? [] : Array.isArray(rol) ? rol : [rol]

  const byPermission =
    requiredPermissions.length > 0 &&
    (modo === 'todos'
      ? permissions.tieneTodosLosPermisos(requiredPermissions)
      : permissions.tieneAlgunPermiso(requiredPermissions))
  const byRole =
    requiredRoles.length > 0 && permissions.tieneAlgunRol(requiredRoles)

  return byPermission || byRole ? children : fallback
}
