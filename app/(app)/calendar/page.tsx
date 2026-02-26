// app/(app)/calendar/page.tsx
// Server Component — auth check + calendar data fetch.
// Delegates rendering to CalendarClient (Client Component).
// Story 5.7: passes areas list for NewActivityModal.
// Story 5.8: passes timeTotals + activeTimers for time tracking UI.

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CalendarClient } from './_components/CalendarClient'
import { getActivitiesForYear } from '@/lib/db/queries/calendar'
import { getAreasForUser } from '@/actions/calendar'
import { getTimeTotalsForActivities, getActiveTimersForActivities } from '@/actions/timer'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'

export default async function CalendarPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch activities and areas in parallel; fall back to empty arrays on error
  let events: ICalendarEvent[] = []
  const [activitiesResult, areas] = await Promise.allSettled([
    getActivitiesForYear(user.id, new Date()),
    getAreasForUser(),
  ])

  if (activitiesResult.status === 'fulfilled') {
    events = activitiesResult.value
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
  } else {
    console.error('[CalendarPage] getActivitiesForYear failed:', activitiesResult.reason)
  }

  const areasData = areas.status === 'fulfilled' ? areas.value : []

  // Fetch time tracking data for all activities in parallel
  const activityIds = events.map((e) => e.id)
  const [timeTotalsResult, activeTimersResult] = await Promise.allSettled([
    getTimeTotalsForActivities(user.id, activityIds),
    getActiveTimersForActivities(user.id, activityIds),
  ])

  const timeTotals = timeTotalsResult.status === 'fulfilled' ? timeTotalsResult.value : {}
  const activeTimers = activeTimersResult.status === 'fulfilled' ? activeTimersResult.value : {}

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
      <CalendarClient
        events={events}
        defaultView="week"
        areas={areasData}
        timeTotals={timeTotals}
        initialActiveTimers={activeTimers}
      />
    </div>
  )
}
