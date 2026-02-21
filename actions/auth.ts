'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { createSupabaseServerClient } from '@/lib/supabase/server'

const emailSchema = z.string().email('Ingresa un email válido')

export async function sendMagicLink(formData: FormData): Promise<void> {
  const email = formData.get('email') as string

  const parsed = emailSchema.safeParse(email)
  if (!parsed.success) {
    redirect('/login?error=invalid_email')
  }

  try {
    const supabase = await createSupabaseServerClient()
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    })

    if (error) {
      redirect('/login?error=send_failed')
    }
  } catch {
    redirect('/login?error=unexpected')
  }

  redirect('/login?success=true')
}
