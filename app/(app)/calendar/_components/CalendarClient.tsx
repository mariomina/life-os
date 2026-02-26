'use client'

// app/(app)/calendar/_components/CalendarClient.tsx
// Client Component — big-calendar integration base.
// Implements the 5-view calendar (Day / Week / Month / Year / Agenda)
// using the types and structure from lramos33/big-calendar,
// adapted to Tailwind v4 and date-fns v4.
//
// Story 5.2: fix timezone (getUTCHours→getHours), Time Budget panel, action buttons.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  format,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  startOfWeek,
  eachDayOfInterval,
  endOfWeek,
  isToday,
  isSameMonth,
} from 'date-fns'
import { es } from 'date-fns/locale'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { TCalendarView, ICalendarEvent } from '@/lib/calendar/calendar-utils'
import {
  formatDateHeader,
  getMonthGridDays,
  getDayHourSlots,
  getEventsForDay,
} from '@/lib/calendar/calendar-utils'

// ─── Types ────────────────────────────────────────────────────────────────────

interface CalendarClientProps {
  events?: ICalendarEvent[]
  defaultView?: TCalendarView
}

// ─── Color mapping ────────────────────────────────────────────────────────────

const EVENT_COLOR_CLASSES: Record<string, string> = {
  blue: 'bg-blue-500/20 border-blue-500 text-blue-700 dark:text-blue-300',
  green: 'bg-green-500/20 border-green-500 text-green-700 dark:text-green-300',
  red: 'bg-red-500/20 border-red-500 text-red-700 dark:text-red-300',
  yellow: 'bg-yellow-500/20 border-yellow-500 text-yellow-700 dark:text-yellow-300',
  purple: 'bg-purple-500/20 border-purple-500 text-purple-700 dark:text-purple-300',
  orange: 'bg-orange-500/20 border-orange-500 text-orange-700 dark:text-orange-300',
  gray: 'bg-gray-500/20 border-gray-500 text-gray-700 dark:text-gray-300',
}

// ─── Time Budget helpers ───────────────────────────────────────────────────────

const AVAILABLE_MINUTES = 16 * 60 // 6:00–22:00 = 960 min (daily)
const AVAILABLE_WEEKLY_MINUTES = 16 * 60 * 7 // 16h × 7 days = 6720 min (weekly)

export function calcTimeBudget(events: ICalendarEvent[]) {
  const committed = events.reduce((acc, e) => {
    return acc + (e.end.getTime() - e.start.getTime()) / 60000
  }, 0)
  return {
    committed,
    available: AVAILABLE_MINUTES,
    free: AVAILABLE_MINUTES - committed,
  }
}

export function calcWeeklyTimeBudget(events: ICalendarEvent[]) {
  const committed = events.reduce((acc, e) => {
    return acc + (e.end.getTime() - e.start.getTime()) / 60000
  }, 0)
  return {
    committed,
    available: AVAILABLE_WEEKLY_MINUTES,
    free: AVAILABLE_WEEKLY_MINUTES - committed,
  }
}

function formatMinutes(minutes: number): string {
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = Math.round(abs % 60)
  return `${h}h ${m}m`
}

// ─── Time Budget Panel (AC4) ───────────────────────────────────────────────────

function TimeBudgetPanel({ events }: { events: ICalendarEvent[] }) {
  const { committed, available, free } = calcTimeBudget(events)
  const isOvercommitted = free < 0

  return (
    <div className="flex items-center gap-6 px-4 py-2 border-b border-border bg-muted/30 text-sm">
      <span className="font-medium text-foreground">Time Budget</span>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>Comprometido:</span>
        <span className="font-semibold text-foreground">{formatMinutes(committed)}</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>Disponible:</span>
        <span className="font-semibold text-foreground">{formatMinutes(available)}</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>Libre:</span>
        <span
          className={`font-semibold ${isOvercommitted ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}
        >
          {isOvercommitted ? '-' : ''}
          {formatMinutes(free)}
        </span>
      </div>
    </div>
  )
}

// ─── Weekly Time Budget Panel (AC3 Story 5.3) ─────────────────────────────────

function WeeklyTimeBudgetPanel({ events }: { events: ICalendarEvent[] }) {
  const { committed, available, free } = calcWeeklyTimeBudget(events)
  const isOvercommitted = free < 0

  return (
    <div className="flex items-center gap-6 px-4 py-2 border-b border-border bg-muted/30 text-sm">
      <span className="font-medium text-foreground">Time Budget Semanal</span>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>Comprometido:</span>
        <span className="font-semibold text-foreground">{formatMinutes(committed)}</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>Disponible:</span>
        <span className="font-semibold text-foreground">{formatMinutes(available)}</span>
      </div>
      <div className="flex items-center gap-1 text-muted-foreground">
        <span>Libre:</span>
        <span
          className={`font-semibold ${isOvercommitted ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}
        >
          {isOvercommitted ? '-' : ''}
          {formatMinutes(free)}
        </span>
      </div>
    </div>
  )
}

// ─── Event Action Buttons (AC5) ────────────────────────────────────────────────

function showToast(message: string) {
  const el = document.createElement('div')
  el.textContent = message
  el.style.cssText =
    'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#1e293b;color:#f8fafc;padding:10px 20px;border-radius:8px;z-index:9999;font-size:14px;pointer-events:none;'
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 2500)
}

function EventActionButtons({
  evt,
  onCheckin,
}: {
  evt: ICalendarEvent
  onCheckin: (id: string) => void
}) {
  const isDone = (evt as { status?: string }).status === 'done'

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {!isDone && (
        <button
          aria-label={`Iniciar ${evt.title}`}
          onClick={() => showToast('Timer — próximamente en Story 5.8')}
          className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
        >
          Iniciar
        </button>
      )}
      <button
        aria-label={`Check-in ${evt.title}`}
        onClick={() => onCheckin(evt.id)}
        className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Check-in
      </button>
      <button
        aria-label={`Omitir ${evt.title}`}
        onClick={() => showToast('Omitir — próximamente en Story 5.7')}
        className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
      >
        Omitir
      </button>
    </div>
  )
}

// ─── Sub-views ────────────────────────────────────────────────────────────────

function WeekView({ currentDate, events }: { currentDate: Date; events: ICalendarEvent[] }) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })
  const hours = getDayHourSlots(currentDate, 7, 22)

  return (
    <div className="overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-border sticky top-0 bg-background z-10">
        <div className="p-2" /> {/* Time gutter */}
        {weekDays.map((day) => (
          <div
            key={day.toISOString()}
            className={`p-2 text-center text-xs font-medium border-l border-border ${
              isToday(day) ? 'text-primary font-bold' : 'text-muted-foreground'
            }`}
          >
            <div>{format(day, 'EEE', { locale: es })}</div>
            <div
              className={`text-lg leading-tight ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}
            >
              {format(day, 'd')}
            </div>
          </div>
        ))}
      </div>

      {/* Hour rows */}
      <div className="relative">
        {hours.map((hour) => (
          <div
            key={hour.toISOString()}
            className="grid grid-cols-8 border-b border-border/50 min-h-14"
          >
            <div className="p-1 pr-2 text-right text-xs text-muted-foreground">
              {format(hour, 'HH:mm')}
            </div>
            {weekDays.map((day) => {
              const dayEvents = getEventsForDay(events, day).filter((e) => {
                // AC3 fix: local hours for correct timezone display
                return e.start.getHours() === hour.getHours()
              })
              return (
                <div key={day.toISOString()} className="border-l border-border/50 p-0.5 relative">
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className={`text-xs rounded border-l-2 px-1 py-0.5 mb-0.5 truncate ${EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
                    >
                      {evt.title}
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

function MonthView({ currentDate, events }: { currentDate: Date; events: ICalendarEvent[] }) {
  const days = getMonthGridDays(currentDate)
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

  return (
    <div>
      {/* Day name headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map((name) => (
          <div key={name} className="p-2 text-center text-xs font-medium text-muted-foreground">
            {name}
          </div>
        ))}
      </div>
      {/* Grid */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const dayEvents = getEventsForDay(events, day)
          const inCurrentMonth = isSameMonth(day, currentDate)
          return (
            <div
              key={day.toISOString()}
              className={`min-h-24 border-b border-r border-border p-1 ${
                !inCurrentMonth ? 'bg-muted/30' : ''
              }`}
            >
              <span
                className={`text-xs font-medium inline-flex items-center justify-center w-6 h-6 rounded-full ${
                  isToday(day)
                    ? 'bg-primary text-primary-foreground'
                    : inCurrentMonth
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {format(day, 'd')}
              </span>
              {/* Dot indicator (AC3 Story 5.4) — visible only for days in current month with events */}
              {inCurrentMonth && dayEvents.length > 0 && (
                <div className="w-1 h-1 rounded-full bg-primary mx-auto mt-0.5" />
              )}
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((evt) => (
                  <div
                    key={evt.id}
                    className={`text-xs rounded px-1 truncate border-l-2 ${EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
                  >
                    {evt.title}
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="text-xs text-muted-foreground">+{dayEvents.length - 3} más</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DayView({ currentDate, events }: { currentDate: Date; events: ICalendarEvent[] }) {
  const router = useRouter()
  const hours = getDayHourSlots(currentDate, 7, 22)
  const dayEvents = getEventsForDay(events, currentDate)

  function handleCheckin(activityId: string) {
    router.push(`/checkin?activityId=${activityId}`)
  }

  return (
    <div className="overflow-auto">
      {hours.map((hour) => {
        // AC3 fix: local hours for correct timezone display
        const slotEvents = dayEvents.filter((e) => e.start.getHours() === hour.getHours())
        return (
          <div key={hour.toISOString()} className="flex border-b border-border/50 min-h-14">
            <div className="w-16 p-1 pr-2 text-right text-xs text-muted-foreground shrink-0">
              {format(hour, 'HH:mm')}
            </div>
            <div className="flex-1 border-l border-border/50 p-1 space-y-0.5">
              {slotEvents.map((evt) => (
                <div
                  key={evt.id}
                  className={`group text-sm rounded border-l-2 px-2 py-1 ${EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
                >
                  <span className="font-medium">{evt.title}</span>
                  <EventActionButtons evt={evt} onCheckin={handleCheckin} />
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AgendaView({ currentDate, events }: { currentDate: Date; events: ICalendarEvent[] }) {
  const next30Days = eachDayOfInterval({
    start: currentDate,
    end: addDays(currentDate, 29),
  })

  const daysWithEvents = next30Days
    .map((day) => ({ day, events: getEventsForDay(events, day) }))
    .filter(({ events }) => events.length > 0)

  if (daysWithEvents.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No hay eventos en los próximos 30 días
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {daysWithEvents.map(({ day, events: dayEvents }) => (
        <div key={day.toISOString()}>
          <div
            className={`text-sm font-semibold mb-2 ${isToday(day) ? 'text-primary' : 'text-foreground'}`}
          >
            {format(day, "EEEE, d 'de' MMMM", { locale: es })}
            {isToday(day) && (
              <span className="ml-2 text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                Hoy
              </span>
            )}
          </div>
          <div className="space-y-1 pl-4">
            {dayEvents.map((evt) => (
              <div
                key={evt.id}
                className={`text-sm rounded border-l-2 px-3 py-1.5 flex items-center gap-3 ${EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
              >
                <span className="text-xs text-muted-foreground">{format(evt.start, 'HH:mm')}</span>
                <span className="font-medium">{evt.title}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function YearView({ currentDate, events }: { currentDate: Date; events: ICalendarEvent[] }) {
  const year = currentDate.getFullYear()
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))

  return (
    <div className="grid grid-cols-3 gap-4 p-4">
      {months.map((monthDate) => {
        const days = getMonthGridDays(monthDate)
        const monthName = format(monthDate, 'MMMM', { locale: es })
        return (
          <div key={monthDate.toISOString()} className="border border-border rounded-lg p-3">
            <h3 className="text-sm font-semibold text-foreground mb-2 capitalize">{monthName}</h3>
            <div className="grid grid-cols-7 gap-px">
              {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((d) => (
                <div key={d} className="text-center text-[10px] text-muted-foreground">
                  {d}
                </div>
              ))}
              {days.map((day) => {
                const hasEvents = getEventsForDay(events, day).length > 0
                const inMonth = isSameMonth(day, monthDate)
                return (
                  <div
                    key={day.toISOString()}
                    className={`text-center text-[10px] leading-5 rounded-full ${
                      isToday(day)
                        ? 'bg-primary text-primary-foreground font-bold'
                        : hasEvents && inMonth
                          ? 'bg-blue-200 dark:bg-blue-900 text-blue-800 dark:text-blue-100'
                          : inMonth
                            ? 'text-foreground'
                            : 'text-muted-foreground/30'
                    }`}
                  >
                    {inMonth ? format(day, 'd') : ''}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Main CalendarClient ──────────────────────────────────────────────────────

const VIEW_LABELS: Record<TCalendarView, string> = {
  day: 'Día',
  week: 'Semana',
  month: 'Mes',
  year: 'Año',
  agenda: 'Agenda',
}

const AVAILABLE_VIEWS: TCalendarView[] = ['day', 'week', 'month', 'year', 'agenda']

export function CalendarClient({ events = [], defaultView = 'week' }: CalendarClientProps) {
  const [view, setView] = useState<TCalendarView>(defaultView)
  const [currentDate, setCurrentDate] = useState(new Date())

  // Events for the currently displayed day — used by Time Budget panel (AC4)
  const currentDayEvents = getEventsForDay(events, currentDate)

  function navigate(direction: 'prev' | 'next' | 'today') {
    if (direction === 'today') {
      setCurrentDate(new Date())
      return
    }
    const delta = direction === 'next' ? 1 : -1
    setCurrentDate((prev) => {
      switch (view) {
        case 'day':
          return delta > 0 ? addDays(prev, 1) : subDays(prev, 1)
        case 'week':
          return delta > 0 ? addWeeks(prev, 1) : subWeeks(prev, 1)
        case 'month':
          return delta > 0 ? addMonths(prev, 1) : subMonths(prev, 1)
        case 'year':
          return delta > 0 ? addYears(prev, 1) : subYears(prev, 1)
        case 'agenda':
          return delta > 0 ? addMonths(prev, 1) : subMonths(prev, 1)
        default:
          return prev
      }
    })
  }

  return (
    <div className="flex flex-col h-full rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        {/* Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('today')}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
          >
            Hoy
          </button>
          <button
            onClick={() => navigate('prev')}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => navigate('next')}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <h2 className="text-sm font-semibold text-foreground capitalize">
            {formatDateHeader(currentDate, view)}
          </h2>
        </div>

        {/* View selector */}
        <div className="flex items-center gap-1 rounded-lg border border-border p-1">
          {AVAILABLE_VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                view === v
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted'
              }`}
            >
              {VIEW_LABELS[v]}
            </button>
          ))}
        </div>
      </div>

      {/* Time Budget panel — only in Day view (AC4 Story 5.2) */}
      {view === 'day' && <TimeBudgetPanel events={currentDayEvents} />}

      {/* Weekly Time Budget panel — only in Week view (AC3 Story 5.3) */}
      {view === 'week' && <WeeklyTimeBudgetPanel events={events} />}

      {/* Calendar body */}
      <div className="flex-1 overflow-auto">
        {view === 'week' && <WeekView currentDate={currentDate} events={events} />}
        {view === 'month' && <MonthView currentDate={currentDate} events={events} />}
        {view === 'day' && <DayView currentDate={currentDate} events={events} />}
        {view === 'year' && <YearView currentDate={currentDate} events={events} />}
        {view === 'agenda' && <AgendaView currentDate={currentDate} events={events} />}
      </div>
    </div>
  )
}
