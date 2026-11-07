import { lazy, Suspense, useEffect } from 'react'
import { QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from 'react-router-dom'
import { Toaster, toast } from 'sonner'
import { queryClient } from './query-client'
import { ProtectedRoute } from '../features/auth/components/protected-route'
import {
  useIdentity,
  useApplySchoolIdentity,
} from '../features/identity/hooks/use-identity'
import { ApiError } from '../shared/api/errors'
import { texts } from '../shared/texts'
import { ErrorBoundary } from '../shared/ui/error-boundary'
import { StatusState } from '../shared/ui/status-state'
import { sessionQueryKey, useSession } from '../features/auth/hooks/use-session'

const LoginPage = lazy(() => import('../features/auth/pages/login-page'))
const RecoverPasswordPage = lazy(
  () => import('../features/auth/pages/recover-password-page'),
)
const ResetPasswordPage = lazy(
  () => import('../features/auth/pages/reset-password-page'),
)
const ChangePasswordPage = lazy(
  () => import('../features/auth/pages/change-password-page'),
)
const DashboardPage = lazy(
  () => import('../features/dashboard/pages/dashboard-page'),
)
const AppShell = lazy(() => import('../app/app-shell'))
const ForbiddenPage = lazy(() => import('../app/pages/forbidden-page'))
const NotFoundPage = lazy(() => import('../app/pages/not-found-page'))

function IdentityGate() {
  const identity = useIdentity()
  useApplySchoolIdentity(identity.data)

  if (!identity.subdomain) {
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-bold">{texts.states.noSchoolTitle}</h1>
        <p className="mt-3 text-muted-foreground">{texts.schoolNotFound}</p>
      </main>
    )
  }

  if (identity.isPending) {
    return <StatusState state="loading" message={texts.identity.loading} />
  }

  if (identity.isError) {
    const apiError =
      identity.error instanceof ApiError ? identity.error : undefined
    const notFound = apiError?.status === 404 || apiError?.status === 422
    return (
      <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center p-6">
        {notFound ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold">{texts.identity.notFound}</h1>
            <p className="mt-3 text-muted-foreground">{texts.schoolNotFound}</p>
          </div>
        ) : (
          <StatusState
            state="error"
            message={identity.error.message || texts.identity.retry}
            onRetry={() => void identity.refetch()}
          />
        )}
      </main>
    )
  }

  return <Outlet />
}

function SessionExpiryHandler() {
  const location = useLocation()
  const navigate = useNavigate()
  const client = useQueryClient()

  useEffect(() => {
    const onExpired = () => {
      const from = `${location.pathname}${location.search}${location.hash}`
      client.setQueryData(sessionQueryKey, null)
      toast.error(texts.sessionExpired)
      navigate('/login', { replace: true, state: { from } })
    }

    window.addEventListener('sge:session-expired', onExpired)
    return () => window.removeEventListener('sge:session-expired', onExpired)
  }, [client, location.hash, location.pathname, location.search, navigate])

  return null
}

function LoadingRoute() {
  return <StatusState state="loading" />
}

function AppRoutes() {
  const { data: user } = useSession()
  const location = useLocation()

  if (
    user?.requiere_cambio_contrasena &&
    location.pathname !== '/cambiar-contrasena'
  ) {
    return (
      <>
        <SessionExpiryHandler />
        <Navigate to="/cambiar-contrasena" replace />
      </>
    )
  }

  return (
    <>
      <SessionExpiryHandler />
      <Suspense fallback={<LoadingRoute />}>
        <Routes>
          <Route element={<IdentityGate />}>
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/recuperar-contrasena"
              element={<RecoverPasswordPage />}
            />
            <Route
              path="/restablecer-contrasena"
              element={<ResetPasswordPage />}
            />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route element={<ProtectedRoute requirePasswordChangeRoute />}>
              <Route
                path="/cambiar-contrasena"
                element={<ChangePasswordPage />}
              />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<AppShell />}>
                <Route index element={<DashboardPage />} />
              </Route>
            </Route>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary>
          <AppRoutes />
        </ErrorBoundary>
        <Toaster
          position="top-right"
          richColors
          closeButton
          aria-label={texts.navigation.toastRegion}
        />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
