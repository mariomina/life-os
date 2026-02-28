import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { getWeeklyReviewData } from '@/actions/weekly-review'
import { WeeklyReviewClient } from './_components/WeeklyReviewClient'

/**
 * Weekly Review page — Server Component.
 * Story 8.8 — Wizard guiado de 4 fases.
 */
export default async function WeeklyReviewPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const data = await getWeeklyReviewData()

  return <WeeklyReviewClient data={data} />
}
