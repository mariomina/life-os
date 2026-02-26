// app/(app)/calendar/page.tsx
// Server Component — auth check + calendar data fetch.
// Delegates rendering to CalendarClient (Client Component).

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CalendarClient } from './_components/CalendarClient'
import { getActivitiesForWeek } from '@/lib/db/queries/calendar'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'

export default async function CalendarPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch today's activities; fall back to empty array on error (AC2)
  let events: ICalendarEvent[] = []
  try {
    const activities = await getActivitiesForWeek(user.id, new Date())
    events = activities
      .filter((a) => a.scheduledAt != null)
      .map((a) => {
        const start = new Date(a.scheduledAt)
        const durationMs = (a.scheduledDurationMinutes ?? 30) * 60 * 1000
        return {
          id: a.id,
          title: a.title,
          start,
          end: new Date(start.getTime() + durationMs),
          color: a.areaColor,
          description: a.areaName ?? undefined,
        }
      })
  } catch (err) {
    console.error('[CalendarPage] getActivitiesForWeek failed:', err)
  }

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-8rem)]">
      {/* Header */}
      <section className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">Calendario</h1>
        <p className="text-sm text-muted-foreground">
          Visualiza y planifica tus actividades, hábitos y eventos
        </p>
      </section>

      {/* Calendar */}
      <CalendarClient events={events} defaultView="week" />
    </div>
  )
}
