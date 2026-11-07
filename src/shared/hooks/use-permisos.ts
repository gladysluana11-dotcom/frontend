import { useMemo } from 'react'
import { useSession } from '../../features/auth/hooks/use-session'
import { extractRoles, normalizeRole } from '../../features/auth/utils/roles'

function extractPermissions(user: object | null | undefined): string[] {
  if (!user) return []

  const candidates: unknown[] = []
  if ('permisos' in user) candidates.push(user.permisos)
  if ('permissions' in user) candidates.push(user.permissions)

  return candidates.flatMap((candidate) =>
    Array.isArray(candidate)
      ? candidate.filter(
          (permission): permission is string => typeof permission === 'string',
        )
      : [],
  )
}

/**
 * Permisos y roles del usuario autenticado. La API entrega hoy los roles; la lista de
 * permisos llegará cuando el backend la incluya en /auth/me. Hasta entonces, la
 * autorización visual se basa en roles. La autorización real siempre está en el backend.
 */
export function usePermisos() {
  const { data: user } = useSession()
  const permissions = useMemo(() => extractPermissions(user), [user])
  const permissionSet = useMemo(() => new Set(permissions), [permissions])
  const roles = useMemo(() => extractRoles(user), [user])
  const roleSet = useMemo(() => new Set(roles), [roles])

  return {
    permisos: permissions,
    roles,
    tienePermiso: (permission: string) => permissionSet.has(permission),
    tieneAlgunPermiso: (required: string[]) =>
      required.some((permission) => permissionSet.has(permission)),
    tieneTodosLosPermisos: (required: string[]) =>
      required.every((permission) => permissionSet.has(permission)),
    tieneRol: (role: string) => roleSet.has(normalizeRole(role)),
    tieneAlgunRol: (required: string[]) =>
      required.some((role) => roleSet.has(normalizeRole(role))),
  }
}
