import { Link } from 'react-router-dom'
import { texts } from '../../../shared/texts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { StatusState } from '../../../shared/ui/status-state'
import { formatSoles } from '../../../shared/utils/format'
import { useDebtAlerts } from '../../debts/hooks/use-debts'

export function DebtAlertsCards() {
  const alerts = useDebtAlerts()

  if (alerts.isPending) {
    return (
      <StatusState state="loading" message={texts.dashboard.chartLoading} />
    )
  }
  if (alerts.isError) {
    return (
      <StatusState
        state="error"
        message={alerts.error.message}
        onRetry={() => void alerts.refetch()}
      />
    )
  }

  const items = [
    {
      label: texts.dashboard.dueSoon,
      count: alerts.data.por_vencer.cantidad,
      amount: alerts.data.por_vencer.monto,
      note: texts.dashboard.alertDays(alerts.data.dias_configurados),
    },
    {
      label: texts.dashboard.overdue,
      count: alerts.data.vencidas.cantidad,
      amount: alerts.data.vencidas.monto,
      note: texts.debts.overdueAmount,
    },
  ]

  return (
    <section aria-labelledby="debt-alerts-title" className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 id="debt-alerts-title" className="text-xl font-semibold">
          {texts.dashboard.alertsTitle}
        </h2>
        <Link
          to="/deudas"
          className="font-medium text-[var(--school-primary)] underline"
        >
          {texts.dashboard.viewDebts}
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Card key={item.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold">{item.count}</p>
              <p className="text-sm text-muted-foreground">{item.note}</p>
              <p className="mt-2 font-medium">{formatSoles(item.amount)}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
