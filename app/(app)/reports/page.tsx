import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getTimeByArea, getTimeByProject } from '@/actions/reports'
import { ReportsClient } from './_components/ReportsClient'

/**
 * Página de Informes — Server Component.
 * Story 8.1 — Time by Area + Time by Project.
 */
export default async function ReportsPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Load initial data for default period ('week') in parallel
  const [timeByArea, timeByProject] = await Promise.all([
    getTimeByArea('week'),
    getTimeByProject('week'),
  ])

  return (
    <ReportsClient
      initialTimeByArea={timeByArea}
      initialTimeByProject={timeByProject}
      initialPeriod="week"
    />
  )
}
