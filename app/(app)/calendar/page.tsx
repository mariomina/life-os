// app/(app)/calendar/page.tsx
// Server Component — auth check + calendar data fetch.
// Delegates rendering to CalendarClient (Client Component).
// Story 5.8: passes timeTotals + activeTimers for time tracking UI.
// Story 5.9: passes initialTimerStartedAt for live clock seed.

import { redirect } from 'next/navigation'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { CalendarClient } from './_components/CalendarClient'
import { getActivitiesForYear } from '@/lib/db/queries/calendar'
import {
  getTimeTotalsForActivities,
  getActiveTimersForActivities,
  getActiveTimerStartTimes,
} from '@/actions/timer'
import { getUserSkills, getSkillTagsForActivities } from '@/lib/db/queries/skills'
import { getCalendarsForUser, seedDefaultCalendars } from '@/actions/calendars'
import { getHolidaysForUser } from '@/lib/db/queries/holidays'
import { autoSyncHolidaysIfNeeded } from '@/actions/holidays'
import type { ICalendarEvent } from '@/lib/calendar/calendar-utils'

export default async function CalendarPage() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Seed default calendars on first visit if user has none
  await seedDefaultCalendars()

  // Auto-sync Ecuador public holidays for current and next year (best-effort, non-blocking)
  const currentYear = new Date().getFullYear()
  await Promise.allSettled([
    autoSyncHolidaysIfNeeded(user.id, currentYear),
    autoSyncHolidaysIfNeeded(user.id, currentYear + 1),
  ])

  // Fetch activities, calendars and holidays in parallel
  let events: ICalendarEvent[] = []
  const [activitiesResult, calendarsResult, holidaysResult] = await Promise.allSettled([
    getActivitiesForYear(user.id, new Date()),
    getCalendarsForUser(),
    getHolidaysForUser(user.id),
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
          description: a.description ?? undefined,
          planned: a.planned,
          // Story 10.2: calendarColor tiene precedencia sobre areaColor en la UI
          calendarId: a.calendarId ?? undefined,
          calendarColor: a.calendarColor ?? undefined,
          calendarName: a.calendarName ?? undefined,
        }
      })
  } else {
    console.error('[CalendarPage] getActivitiesForYear failed:', activitiesResult.reason)
  }

  const calendarsData = calendarsResult.status === 'fulfilled' ? calendarsResult.value : []
  const holidaysData = holidaysResult.status === 'fulfilled' ? holidaysResult.value : []

  // Fetch time tracking data + skills data in parallel (Story 5.8 + 5.9 + 7.2)
  const activityIds = events.map((e) => e.id)
  const [
    timeTotalsResult,
    activeTimersResult,
    timerStartTimesResult,
    userSkillsResult,
    skillTagsResult,
  ] = await Promise.allSettled([
    getTimeTotalsForActivities(user.id, activityIds),
    getActiveTimersForActivities(user.id, activityIds),
    getActiveTimerStartTimes(user.id, activityIds),
    getUserSkills(user.id),
    getSkillTagsForActivities(activityIds, user.id),
  ])

  const timeTotals = timeTotalsResult.status === 'fulfilled' ? timeTotalsResult.value : {}
  const activeTimers = activeTimersResult.status === 'fulfilled' ? activeTimersResult.value : {}
  const timerStartTimes =
    timerStartTimesResult.status === 'fulfilled' ? timerStartTimesResult.value : {}
  const userSkills = userSkillsResult.status === 'fulfilled' ? userSkillsResult.value : []
  const initialSkillTags = skillTagsResult.status === 'fulfilled' ? skillTagsResult.value : {}

  // Story 10.2 (AC7): no wrapper div — layout.tsx provides h-full container
  return (
    <CalendarClient
      events={events}
      defaultView="week"
      calendars={calendarsData}
      holidays={holidaysData}
      timeTotals={timeTotals}
      initialActiveTimers={activeTimers}
      initialTimerStartedAt={timerStartTimes}
      userSkills={userSkills}
      initialSkillTags={initialSkillTags}
    />
  )
}
