import { useMemo } from 'react'
import { useSession } from '../../features/auth/hooks/use-session'

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

export function usePermisos() {
  const { data: user } = useSession()
  const permissions = useMemo(() => extractPermissions(user), [user])
  const permissionSet = useMemo(() => new Set(permissions), [permissions])

  return {
    permisos: permissions,
    tienePermiso: (permission: string) => permissionSet.has(permission),
    tieneAlgunPermiso: (required: string[]) =>
      required.some((permission) => permissionSet.has(permission)),
    tieneTodosLosPermisos: (required: string[]) =>
      required.every((permission) => permissionSet.has(permission)),
  }
}
