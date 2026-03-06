// lib/calendar/calendar-utils.ts
// Pure utility functions for calendar data transformation.
// No DB, no React — importable from Server Actions, Client Components, and tests.

import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  addMinutes,
  format,
  isToday,
  isSameDay,
  isSameMonth,
  eachDayOfInterval,
  getDay,
} from 'date-fns'
import { es } from 'date-fns/locale'

// ─── Types ─────────────────────────────────────────────────────────────────────

export type TCalendarView = 'day' | 'week' | 'month' | 'year' | 'agenda'
export type TEventColor = 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'orange' | 'gray'

export interface ICalendarEvent {
  id: string
  title: string
  start: Date
  end: Date
  color?: TEventColor
  description?: string
  planned?: boolean
  areaId?: string
  calendarId?: string
  calendarColor?: string // hex — tiene precedencia sobre color de área en la UI
  calendarName?: string
  recurrenceGroupId?: string
  isAllDay?: boolean
}

export interface IDateRange {
  start: Date
  end: Date
}

// ─── Source activity shape (minimal — avoids importing DB schema) ─────────────

interface ActivityLike {
  id: string
  title: string
  description?: string | null
  scheduledAt: Date | null
  scheduledDurationMinutes: number | null
  planned?: boolean
  areaId?: string | null
  calendarId?: string | null
  calendarColor?: string | null
  calendarName?: string | null
  recurrenceGroupId?: string | null
}

// ─── Event conversion ─────────────────────────────────────────────────────────

/**
 * Converts a steps_activity record to the ICalendarEvent format used by the calendar.
 * Activities without a scheduledAt are excluded (returns null).
 */
export function toCalendarEvent(
  activity: ActivityLike,
  color: TEventColor = 'blue'
): ICalendarEvent | null {
  if (!activity.scheduledAt) return null

  const start = new Date(activity.scheduledAt)
  const durationMinutes = activity.scheduledDurationMinutes ?? 30
  const durationMs = durationMinutes * 60 * 1000
  const end = new Date(start.getTime() + durationMs)
  const isAllDay = durationMinutes >= 1440

  return {
    id: activity.id,
    title: activity.title,
    start,
    end,
    color,
    ...(activity.description != null && { description: activity.description }),
    ...(activity.planned != null && { planned: activity.planned }),
    ...(activity.areaId != null && { areaId: activity.areaId }),
    ...(activity.calendarId != null && { calendarId: activity.calendarId }),
    ...(activity.calendarColor != null && { calendarColor: activity.calendarColor }),
    ...(activity.calendarName != null && { calendarName: activity.calendarName }),
    ...(activity.recurrenceGroupId != null && { recurrenceGroupId: activity.recurrenceGroupId }),
    ...(isAllDay && { isAllDay: true }),
  }
}

/**
 * Converts an array of activities to calendar events, filtering out those without scheduledAt.
 */
export function toCalendarEvents(
  activities: ActivityLike[],
  color: TEventColor = 'blue'
): ICalendarEvent[] {
  return activities.flatMap((a) => {
    const event = toCalendarEvent(a, color)
    return event ? [event] : []
  })
}

// ─── Date range helpers ───────────────────────────────────────────────────────

/**
 * Returns the Monday–Sunday range for a given date (ISO week, Monday first).
 */
export function getWeekRange(date: Date): IDateRange {
  return {
    start: startOfWeek(date, { weekStartsOn: 1 }),
    end: endOfWeek(date, { weekStartsOn: 1 }),
  }
}

/**
 * Returns the start–end of a month for a given date.
 */
export function getMonthRange(date: Date): IDateRange {
  return {
    start: startOfMonth(date),
    end: endOfMonth(date),
  }
}

/**
 * Returns the start–end of a day (00:00:00 – 23:59:59).
 */
export function getDayRange(date: Date): IDateRange {
  return {
    start: startOfDay(date),
    end: endOfDay(date),
  }
}

// ─── Header formatting ────────────────────────────────────────────────────────

/**
 * Formats the calendar header label for each view, in Spanish.
 *
 * - day   → "lunes, 15 de enero de 2024"
 * - week  → "13 – 19 ene 2024"
 * - month → "enero 2024"
 */
export function formatDateHeader(date: Date, view: TCalendarView): string {
  switch (view) {
    case 'day':
      return format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })
    case 'week': {
      const { start, end } = getWeekRange(date)
      if (isSameMonth(start, end)) {
        return `${format(start, 'd')} – ${format(end, 'd MMM yyyy', { locale: es })}`
      }
      return `${format(start, 'd MMM', { locale: es })} – ${format(end, 'd MMM yyyy', { locale: es })}`
    }
    case 'month':
      return format(date, 'MMMM yyyy', { locale: es })
    case 'year':
      return format(date, 'yyyy')
    case 'agenda':
      return format(date, 'MMMM yyyy', { locale: es })
    default:
      return format(date, 'MMMM yyyy', { locale: es })
  }
}

// ─── Calendar grid helpers ────────────────────────────────────────────────────

/**
 * Returns all days that should appear in a month grid view (including padding days
 * from adjacent months to fill complete weeks).
 */
export function getMonthGridDays(date: Date): Date[] {
  const monthStart = startOfMonth(date)
  const monthEnd = endOfMonth(date)
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
  return eachDayOfInterval({ start: gridStart, end: gridEnd })
}

/**
 * Returns the hour slots for day/week view (array of Date objects at each hour boundary).
 */
export function getDayHourSlots(date: Date, fromHour = 0, toHour = 24): Date[] {
  const dayStart = startOfDay(date)
  const slots: Date[] = []
  for (let h = fromHour; h < toHour; h++) {
    slots.push(addMinutes(dayStart, h * 60))
  }
  return slots
}

// ─── Event filtering helpers ──────────────────────────────────────────────────

/**
 * Filters events that fall within a given day.
 */
export function getEventsForDay(events: ICalendarEvent[], day: Date): ICalendarEvent[] {
  return events.filter((e) => {
    if (isSameDay(e.start, day)) return true
    // For all-day events, end = start+24h lands at 00:00 of the next day — don't count it
    if (e.isAllDay) return false
    return isSameDay(e.end, day)
  })
}

/**
 * Filters events that overlap with a given date range.
 */
export function getEventsForRange(events: ICalendarEvent[], range: IDateRange): ICalendarEvent[] {
  return events.filter((e) => e.start <= range.end && e.end >= range.start)
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

/**
 * Formats a time as "HH:mm" in UTC (consistent with scheduledAt storage).
 */
export function formatTimeUTC(date: Date): string {
  return date.toISOString().slice(11, 16)
}

/**
 * Returns true if a date is today.
 */
export { isToday, isSameDay, isSameMonth, getDay }
