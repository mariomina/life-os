import { redirect } from 'next/navigation'
import { checkOnboardingStatus } from '@/actions/onboarding'
import AppShell from './AppShell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { completed } = await checkOnboardingStatus()

  if (!completed) {
    redirect('/onboarding')
  }

  return <AppShell>{children}</AppShell>
}
