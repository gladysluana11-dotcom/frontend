import { useSession } from '../../auth/hooks/use-session'
import { texts } from '../../../shared/texts'
import { primaryRoleLabel } from '../../auth/utils/roles'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { PageFrame } from '../../../shared/ui/page-frame'
import { Can } from '../../../shared/ui/can'
import { DebtAlertsCards } from '../components/debt-alerts-cards'
import { DirectorDashboard } from '../components/director-dashboard'
import { DEBT_VIEW_ROLES, FULL_REPORT_ROLES } from '../../debts/roles'

export default function DashboardPage() {
  const { data: user } = useSession()
  const role = user
    ? primaryRoleLabel(user, texts.auth.userFallback)
    : undefined

  return (
    <PageFrame
      eyebrow={texts.dashboard.eyebrow}
      title={`${texts.dashboard.welcome}${user ? `, ${user.nombre}` : ''}`}
      description={texts.dashboard.description}
    >
      <Can permiso="deudas.ver" rol={DEBT_VIEW_ROLES}>
        <DebtAlertsCards />
      </Can>
      <Can permiso="reportes.ver" rol={FULL_REPORT_ROLES}>
        <DirectorDashboard />
      </Can>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>{texts.dashboard.accountTitle}</CardTitle>
          <CardDescription>
            {texts.dashboard.accountDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">
              {texts.dashboard.user}
            </p>
            <p className="mt-1 font-medium">
              {user ? `${user.nombre} ${user.apellido}` : '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">
              {texts.dashboard.role}
            </p>
            <p className="mt-1 font-medium capitalize">
              {role ?? texts.auth.userFallback}
            </p>
          </div>
        </CardContent>
      </Card>
    </PageFrame>
  )
}
