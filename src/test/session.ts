import type { QueryClient } from '@tanstack/react-query'
import type { SessionUser } from '../features/auth/api/auth-api'
import { sessionQueryKey } from '../features/auth/hooks/use-session'

/** Deja en caché una sesión con los roles indicados, para probar pantallas según el rol. */
export function setSessionRoles(client: QueryClient, roles: string[]): void {
  const user = {
    id: 1,
    nombre: 'Diego',
    apellido: 'Director',
    email: 'director@salesian-innova.test',
    colegio_id: 1,
    roles,
    requiere_cambio_contrasena: false,
  } as unknown as SessionUser
  client.setQueryData(sessionQueryKey, user)
}
