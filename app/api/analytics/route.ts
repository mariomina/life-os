// app/api/analytics/route.ts
// Story 10.19 — Analytics de Actividad del Usuario.
// Validates active session and persists user event. Returns 204 on success, 401 if unauthenticated.

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { userEvents } from '@/lib/db/schema/user-events'

export async function POST(req: Request) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return new Response(null, { status: 401 })

  try {
    assertDatabaseUrl()
    const { eventType, metadata } = await req.json()

    if (!eventType || typeof eventType !== 'string') {
      return new Response(null, { status: 400 })
    }

    await db.insert(userEvents).values({
      userId: user.id,
      eventType,
      metadata: metadata ?? null,
    })

    return new Response(null, { status: 204 })
  } catch {
    return new Response(null, { status: 500 })
  }
}
