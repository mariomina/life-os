import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import {
  getTimeByArea,
  getTimeByProject,
  getHabitConsistencyReport,
  getCalendarCommitmentRate,
  getOkrProgressReport,
  getAreaHealthTrends,
  generateReportInsights,
  getAgentLeverageReport,
} from '@/actions/reports'
import { getTimeByCalendarReport } from '@/actions/calendars'
import { ReportsClient } from './_components/ReportsClient'
import { TimeByCalendarWidget } from './_components/TimeByCalendarWidget'

/**
 * Página de Informes — Server Component.
 * Story 8.1 — Time by Area + Time by Project.
 * Story 8.2 — Habit Consistency + CCR + OKR Progress + Area Health Trend.
 * Story 8.6 — Insights IA via ILLMProvider.
 * Story 8.7 — Agent Leverage Report.
 * Story 10.3 — Tiempo por Calendario.
 */
export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load all initial data in parallel for default period ('week')
  const [
    timeByArea,
    timeByProject,
    habitConsistency,
    ccr,
    okrProgress,
    areaHealthTrends,
    insights,
    leverage,
    timeByCalendar,
  ] = await Promise.all([
    getTimeByArea('week'),
    getTimeByProject('week'),
    getHabitConsistencyReport('week'),
    getCalendarCommitmentRate('week'),
    getOkrProgressReport(),
    getAreaHealthTrends(),
    generateReportInsights('week').catch(() => null),
    getAgentLeverageReport('week'),
    getTimeByCalendarReport('month'),
  ])

  return (
    <>
      <ReportsClient
        initialTimeByArea={timeByArea}
        initialTimeByProject={timeByProject}
        initialHabitConsistency={habitConsistency}
        initialCCR={ccr}
        initialOkrProgress={okrProgress}
        initialAreaHealthTrends={areaHealthTrends}
        initialInsights={insights}
        initialLeverage={leverage}
        initialPeriod="week"
      />
      <div className="container max-w-3xl pb-8">
        <TimeByCalendarWidget initialData={timeByCalendar} initialPeriod="month" />
      </div>
    </>
  )
}
