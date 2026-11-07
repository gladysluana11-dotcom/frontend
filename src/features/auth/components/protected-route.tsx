import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { logout } from '../api/auth-api'
import { sessionQueryKey, useSession } from '../hooks/use-session'
import { useIdleSession } from '../../../shared/hooks/use-idle-session'
import { texts } from '../../../shared/texts'
import { StatusState } from '../../../shared/ui/status-state'

type ProtectedRouteProps = {
  requirePasswordChangeRoute?: boolean
  permission?: string
}

export function ProtectedRoute({
  requirePasswordChangeRoute = false,
  permission,
}: ProtectedRouteProps) {
  const { data: user, isError, isPending, refetch } = useSession()
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const navigatePath = `${location.pathname}${location.search}${location.hash}`
  const onTimeout = useCallback(async () => {
    queryClient.setQueryData(sessionQueryKey, null)
    navigate('/login', {
      replace: true,
      state: { from: navigatePath },
    })
    try {
      await logout()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : texts.errors.logout)
    }
  }, [navigate, navigatePath, queryClient])
  const idleWarning = useIdleSession(Boolean(user), onTimeout)

  if (isPending) return <StatusState state="loading" />
  if (isError) {
    return (
      <StatusState
        state="error"
        message={texts.errors.sessionVerification}
        onRetry={() => void refetch()}
      />
    )
  }
  if (!user) {
    const from = `${location.pathname}${location.search}${location.hash}`
    return <Navigate to="/login" replace state={{ from }} />
  }

  const onPasswordChangePage = location.pathname === '/cambiar-contrasena'
  if (user.requiere_cambio_contrasena && !onPasswordChangePage) {
    return <Navigate to="/cambiar-contrasena" replace />
  }
  if (!user.requiere_cambio_contrasena && onPasswordChangePage) {
    return <Navigate to="/" replace />
  }

  if (requirePasswordChangeRoute && !user.requiere_cambio_contrasena) {
    return <Navigate to="/" replace />
  }

  if (permission && !hasPermission(user, permission)) {
    return <Navigate to="/403" replace />
  }

  return (
    <>
      {idleWarning ? (
        <div
          className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 sm:px-6"
          role="status"
        >
          {texts.sessionWarning}
        </div>
      ) : null}
      <Outlet />
    </>
  )
}

function hasPermission(user: object, permission: string): boolean {
  if ('permisos' in user && Array.isArray(user.permisos)) {
    return user.permisos.includes(permission)
  }
  if ('permissions' in user && Array.isArray(user.permissions)) {
    return user.permissions.includes(permission)
  }
  return false
}
