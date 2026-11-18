import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { texts } from '../../../shared/texts'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../../shared/ui/card'
import { StatusState } from '../../../shared/ui/status-state'
import { formatSoles } from '../../../shared/utils/format'
import { useDirectorDashboard } from '../../reports/hooks/use-reports'

export function DirectorDashboard() {
  const dashboard = useDirectorDashboard(true)

  if (dashboard.isPending) {
    return (
      <StatusState state="loading" message={texts.dashboard.chartLoading} />
    )
  }
  if (dashboard.isError) {
    return (
      <StatusState
        state="error"
        message={dashboard.error.message}
        onRetry={() => void dashboard.refetch()}
      />
    )
  }

  const data = dashboard.data
  const metrics = [
    {
      label: texts.dashboard.monthlyCollection,
      value: formatSoles(data.resumen.recaudacion_mes),
    },
    {
      label: texts.dashboard.totalDebt,
      value: formatSoles(data.resumen.deuda_total),
    },
    {
      label: texts.dashboard.delinquency,
      value: `${data.resumen.porcentaje_morosidad}%`,
    },
    {
      label: texts.dashboard.enrolled,
      value: texts.dashboard.dashboardMissingEnrollment,
    },
  ]

  return (
    <section aria-labelledby="director-dashboard-title" className="mb-8">
      <h2 id="director-dashboard-title" className="mb-1 text-2xl font-bold">
        {texts.dashboard.directorTitle}
      </h2>
      <p className="mb-5 text-sm text-muted-foreground">
        {texts.dashboard.directorDescription}
      </p>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xl font-semibold">{metric.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{texts.dashboard.enrollmentByLevel}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.resumen.matriculados_por_nivel.length === 0 ? (
              <StatusState state="empty" />
            ) : (
              <>
                <p className="sr-only">
                  {texts.dashboard.enrollmentByLevel}.{' '}
                  {texts.dashboard.chartTable}
                </p>
                <div
                  aria-hidden="true"
                  className="h-72 min-w-0"
                  data-testid="enrollment-chart"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.resumen.matriculados_por_nivel}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="nivel" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Bar
                        dataKey="matriculados"
                        fill="var(--school-primary)"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <table className="sr-only">
                  <caption>{texts.dashboard.chartTable}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{texts.debts.level}</th>
                      <th scope="col">{texts.dashboard.enrolled}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.resumen.matriculados_por_nivel.map((row) => (
                      <tr key={row.nivel_id}>
                        <th scope="row">{row.nivel}</th>
                        <td>{row.matriculados}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{texts.dashboard.monthlyIncome}</CardTitle>
          </CardHeader>
          <CardContent>
            <p role="status">{texts.dashboard.dashboardMissingIncome}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}
