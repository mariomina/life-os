'use server'

import { createSupabaseServerClient } from '@/lib/supabase/server'

export type OnboardingMethod = 'questionnaire' | 'upload'

/**
 * Checks if the current user has completed onboarding.
 * Returns `completed: true` if user_metadata.onboarding_completed is true.
 * Returns `completed: false` for new users without metadata.
 */
export async function checkOnboardingStatus(): Promise<{ completed: boolean }> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { completed: false }
  }

  const completed = user.user_metadata?.onboarding_completed === true
  return { completed }
}

/**
 * Saves the chosen onboarding method to user_metadata.
 * Sets onboarding_method and keeps onboarding_completed: false
 * (set to true in Story 2.4 when diagnosis is fully complete).
 */
export async function saveOnboardingMethod(
  method: OnboardingMethod
): Promise<{ error: string | null }> {
  const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.updateUser({
    data: {
      onboarding_method: method,
      onboarding_completed: false,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { error: null }
}
