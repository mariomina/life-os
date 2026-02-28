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
} from '@/actions/reports'
import { ReportsClient } from './_components/ReportsClient'

/**
 * Página de Informes — Server Component.
 * Story 8.1 — Time by Area + Time by Project.
 * Story 8.2 — Habit Consistency + CCR + OKR Progress + Area Health Trend.
 * Story 8.6 — Insights IA via ILLMProvider.
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
  ] = await Promise.all([
    getTimeByArea('week'),
    getTimeByProject('week'),
    getHabitConsistencyReport('week'),
    getCalendarCommitmentRate('week'),
    getOkrProgressReport(),
    getAreaHealthTrends(),
    generateReportInsights('week').catch(() => null),
  ])

  return (
    <ReportsClient
      initialTimeByArea={timeByArea}
      initialTimeByProject={timeByProject}
      initialHabitConsistency={habitConsistency}
      initialCCR={ccr}
      initialOkrProgress={okrProgress}
      initialAreaHealthTrends={areaHealthTrends}
      initialInsights={insights}
      initialPeriod="week"
    />
  )
}
