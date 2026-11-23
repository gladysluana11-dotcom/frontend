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
  STUDENT_VIEW_ROLES,
  STUDENT_WRITE_ROLES,
} from '../features/students/roles'
import {
  ENROLLMENT_MANAGE_ROLES,
  ENROLLMENT_VIEW_ROLES,
} from '../features/enrollments/roles'
import {
  PAYMENT_REGISTER_ROLES,
  PAYMENT_VIEW_ROLES,
} from '../features/payments/roles'
import { CASH_CLOSE_ROLES, TARIFF_VIEW_ROLES } from '../features/fees/roles'
import { DEBT_VIEW_ROLES, REPORT_VIEW_ROLES } from '../features/debts/roles'
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
const StudentsPage = lazy(
  () => import('../features/students/pages/students-page'),
)
const StudentDetailPage = lazy(
  () => import('../features/students/pages/student-detail-page'),
)
const StudentCreatePage = lazy(
  () => import('../features/students/pages/student-create-page'),
)
const StudentEditPage = lazy(
  () => import('../features/students/pages/student-edit-page'),
)
const EnrollmentsPage = lazy(
  () => import('../features/enrollments/pages/enrollments-page'),
)
const EnrollmentCreatePage = lazy(
  () => import('../features/enrollments/pages/enrollment-create-page'),
)
const EnrollmentRecordDetailPage = lazy(
  () => import('../features/enrollments/pages/enrollment-detail-page'),
)
const RequiredDocumentsPage = lazy(
  () => import('../features/enrollments/pages/required-documents-page'),
)
const PaymentsPage = lazy(
  () => import('../features/payments/pages/payments-page'),
)
const NewPaymentPage = lazy(
  () => import('../features/payments/pages/new-payment-page'),
)
const PaymentDetailPage = lazy(
  () => import('../features/payments/pages/payment-detail-page'),
)
const StudentAccountPage = lazy(
  () => import('../features/payments/pages/student-account-page'),
)
const TariffsPage = lazy(() => import('../features/fees/pages/tariffs-page'))
const CashboxPage = lazy(() => import('../features/fees/pages/cashbox-page'))
const DebtsPage = lazy(() => import('../features/debts/pages/debts-page'))
const DebtByClassPage = lazy(
  () => import('../features/debts/pages/debt-by-class-page'),
)
const ReportsPage = lazy(() => import('../features/reports/pages/reports-page'))
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
                <Route element={<ProtectedRoute roles={STUDENT_WRITE_ROLES} />}>
                  <Route
                    path="/alumnos/nuevo"
                    element={<StudentCreatePage />}
                  />
                  <Route
                    path="/alumnos/:id/editar"
                    element={<StudentEditPage />}
                  />
                </Route>
                <Route element={<ProtectedRoute roles={STUDENT_VIEW_ROLES} />}>
                  <Route path="/alumnos" element={<StudentsPage />} />
                  <Route path="/alumnos/:id" element={<StudentDetailPage />} />
                </Route>
                <Route
                  element={<ProtectedRoute roles={ENROLLMENT_VIEW_ROLES} />}
                >
                  <Route path="/matriculas" element={<EnrollmentsPage />} />
                  <Route
                    path="/matriculas/:id"
                    element={<EnrollmentRecordDetailPage />}
                  />
                </Route>
                <Route
                  element={<ProtectedRoute roles={ENROLLMENT_MANAGE_ROLES} />}
                >
                  <Route
                    path="/matriculas/nueva"
                    element={<EnrollmentCreatePage />}
                  />
                  <Route
                    path="/configuracion/documentos"
                    element={<RequiredDocumentsPage />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      permission="pagos.ver"
                      roles={PAYMENT_VIEW_ROLES}
                    />
                  }
                >
                  <Route path="/pagos" element={<PaymentsPage />} />
                  <Route path="/pagos/:id" element={<PaymentDetailPage />} />
                  <Route
                    path="/alumnos/:id/estado-cuenta"
                    element={<StudentAccountPage />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      permission="deudas.ver"
                      roles={DEBT_VIEW_ROLES}
                    />
                  }
                >
                  <Route path="/deudas" element={<DebtsPage />} />
                  <Route
                    path="/deudas/por-aula"
                    element={<DebtByClassPage />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      permission="reportes.ver"
                      roles={REPORT_VIEW_ROLES}
                    />
                  }
                >
                  <Route path="/reportes" element={<ReportsPage />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      permission="pagos.registrar"
                      roles={PAYMENT_REGISTER_ROLES}
                    />
                  }
                >
                  <Route path="/pagos/nuevo" element={<NewPaymentPage />} />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      permission="tarifas.ver"
                      roles={TARIFF_VIEW_ROLES}
                    />
                  }
                >
                  <Route
                    path="/configuracion/tarifas"
                    element={<TariffsPage />}
                  />
                </Route>
                <Route
                  element={
                    <ProtectedRoute
                      permission="caja.cerrar"
                      roles={CASH_CLOSE_ROLES}
                    />
                  }
                >
                  <Route path="/caja" element={<CashboxPage />} />
                </Route>
              </Route>
            </Route>
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
