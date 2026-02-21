'use client'

import { createBrowserClient } from '@supabase/ssr'

/**
 * Creates a Supabase client for Client Components.
 * Safe to use in the browser — uses the anon public key only.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
