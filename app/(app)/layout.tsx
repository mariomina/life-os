import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { checkOnboardingStatus } from '@/actions/onboarding'
import { getPendingInboxCount } from '@/lib/db/queries/inbox'
import AppShell from './AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { completed } = await checkOnboardingStatus()

  if (!completed) {
    redirect('/onboarding')
  }

  // Fetch pending inbox count for sidebar badge
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pendingInboxCount = user ? await getPendingInboxCount(user.id) : 0
  const userName = (user?.user_metadata?.full_name as string | undefined) ?? undefined
  const userEmail = user?.email ?? undefined

  return (
    <AppShell pendingInboxCount={pendingInboxCount} userName={userName} userEmail={userEmail}>
      {children}
    </AppShell>
  )
}
