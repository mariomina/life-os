'use client'

// app/(app)/calendar/_components/CalendarClient.tsx
// Client Component — big-calendar integration base.
// Implements the 5-view calendar (Day / Week / Month / Year / Agenda)
// using the types and structure from lramos33/big-calendar,
// adapted to Tailwind v4 and date-fns v4.
//
// Story 5.2: fix timezone (getUTCHours→getHours), Time Budget panel, action buttons.
// Story 5.8: time tracking — start/stop/pause/resume, time totals in DayView.

import { useState, useEffect } from 'react'
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
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import type { TCalendarView, ICalendarEvent } from '@/lib/calendar/calendar-utils'
import {
  formatDateHeader,
  getMonthGridDays,
  getDayHourSlots,
  getEventsForDay,
} from '@/lib/calendar/calendar-utils'
import { NewActivityModal } from './NewActivityModal'
import type { AreaOption } from '@/actions/calendar'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Skill } from '@/lib/db/schema/skills'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimerState {
  entryId: string
  isPaused: boolean
}

interface CalendarClientProps {
  events?: ICalendarEvent[]
  defaultView?: TCalendarView
  areas?: AreaOption[]
  /** Record<activityId, totalSeconds> — accumulated time from completed sessions */
  timeTotals?: Record<string, number>
  /** Record<activityId, entryId> — currently active timer entry per activity */
  initialActiveTimers?: Record<string, string>
  /** Record<activityId, startedAt ISO> — start time of the active session (Story 5.9) */
  initialTimerStartedAt?: Record<string, string>
  /** Active skills for the tag selector (Story 7.2) */
  userSkills?: Skill[]
  /** Record<activityId, skillId[]> — pre-loaded skill tags per activity (Story 7.2) */
  initialSkillTags?: Record<string, string[]>
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Formats total seconds into human-readable string. Returns '' if 0. */
export function formatSeconds(totalSeconds: number): string {
  if (totalSeconds <= 0) return ''
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  if (h > 0) return m > 0 ? `${h}h ${m}min` : `${h}h`
  return `${m} min`
}

/**
 * Formats elapsed seconds for a live timer. Shows seconds.
 * Story 5.9 — AC1 (reloj en vivo con segundos visibles).
 */
export function formatElapsed(totalSeconds: number): string {
  if (totalSeconds <= 0) return '0s'
  const h = Math.floor(totalSeconds / 3600)
  const m = Math.floor((totalSeconds % 3600) / 60)
  const s = totalSeconds % 60
  if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Calculates elapsed seconds between startedAt and now. Never returns negative.
 * Story 5.9 — pure function for testability.
 */
export function calcElapsedSeconds(startedAt: Date, now: Date): number {
  const elapsed = Math.floor((now.getTime() - startedAt.getTime()) / 1000)
  return Math.max(0, elapsed)
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

export function formatMinutes(minutes: number): string {
  const abs = Math.abs(minutes)
  const h = Math.floor(abs / 60)
  const m = Math.round(abs % 60)
  return `${h}h ${m}m`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
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

// ─── Event Action Buttons (Story 5.2 / 5.8) ───────────────────────────────────

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
  onDelete,
  timerState,
  onStartTimer,
  onStopTimer,
  onPauseTimer,
  onResumeTimer,
}: {
  evt: ICalendarEvent
  onCheckin: (id: string) => void
  onDelete?: (id: string) => void
  timerState?: TimerState
  onStartTimer: (activityId: string) => void
  onStopTimer: (activityId: string, entryId: string) => void
  onPauseTimer: (activityId: string, entryId: string) => void
  onResumeTimer: (activityId: string, entryId: string) => void
}) {
  const isDone = (evt as { status?: string }).status === 'done'
  const isPlanned = (evt as { planned?: boolean }).planned !== false
  const isRunning = timerState !== undefined && !timerState.isPaused
  const isPaused = timerState !== undefined && timerState.isPaused

  return (
    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
      {!isDone && (
        <>
          {/* No timer active → show Iniciar */}
          {!timerState && (
            <button
              aria-label={`Iniciar ${evt.title}`}
              onClick={() => onStartTimer(evt.id)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Iniciar
            </button>
          )}
          {/* Timer running → show Detener + Pausar */}
          {isRunning && (
            <>
              <button
                aria-label={`Detener ${evt.title}`}
                onClick={() => onStopTimer(evt.id, timerState.entryId)}
                className="text-[10px] px-1.5 py-0.5 rounded bg-red-500 text-white font-medium hover:bg-red-600 transition-colors"
              >
                Detener
              </button>
              <button
                aria-label={`Pausar ${evt.title}`}
                onClick={() => onPauseTimer(evt.id, timerState.entryId)}
                className="text-[10px] px-1.5 py-0.5 rounded border border-amber-500 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
              >
                Pausar
              </button>
            </>
          )}
          {/* Timer paused → show Reanudar */}
          {isPaused && (
            <button
              aria-label={`Reanudar ${evt.title}`}
              onClick={() => onResumeTimer(evt.id, timerState.entryId)}
              className="text-[10px] px-1.5 py-0.5 rounded bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
            >
              Reanudar
            </button>
          )}
        </>
      )}
      <button
        aria-label={`Check-in ${evt.title}`}
        onClick={() => onCheckin(evt.id)}
        className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        Check-in
      </button>
      {!isPlanned && onDelete && (
        <button
          aria-label={`Eliminar ${evt.title}`}
          onClick={() => {
            if (window.confirm(`¿Eliminar "${evt.title}"?`)) {
              onDelete(evt.id)
            }
          }}
          className="text-[10px] px-1.5 py-0.5 rounded text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
        >
          Eliminar
        </button>
      )}
    </div>
  )
}

// ─── Skill Tag Section (Story 7.2) ────────────────────────────────────────────

function SkillTagSection({
  activityId,
  userSkills,
  taggedSkillIds,
  onTagSkill,
  onRemoveSkillTag,
}: {
  activityId: string
  userSkills: Skill[]
  taggedSkillIds: string[]
  onTagSkill: (activityId: string, skillId: string) => void
  onRemoveSkillTag: (activityId: string, skillId: string) => void
}) {
  if (userSkills.length === 0) return null
  const untagged = userSkills.filter((s) => !taggedSkillIds.includes(s.id))

  return (
    <div className="mt-1.5 space-y-1">
      {taggedSkillIds.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {taggedSkillIds.map((skillId) => {
            const skill = userSkills.find((s) => s.id === skillId)
            if (!skill) return null
            return (
              <span
                key={skillId}
                className="inline-flex items-center gap-0.5 rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-300"
              >
                {skill.name}
                <button
                  aria-label={`Quitar ${skill.name}`}
                  onClick={() => onRemoveSkillTag(activityId, skillId)}
                  className="ml-0.5 leading-none hover:text-red-500"
                >
                  ×
                </button>
              </span>
            )
          })}
        </div>
      )}
      {untagged.length > 0 && (
        <select
          value=""
          onChange={(e) => {
            if (e.target.value) onTagSkill(activityId, e.target.value)
          }}
          className="text-[10px] rounded border border-border bg-background px-1 py-0.5 text-muted-foreground"
        >
          <option value="">+ Etiquetar habilidad</option>
          {untagged.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      )}
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
  const hours = getDayHourSlots(currentDate, 0, 24)

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

function DayView({
  currentDate,
  events,
  onDelete,
  timeTotals,
  activeTimers,
  timerStartedAt,
  elapsedTick,
  onStartTimer,
  onStopTimer,
  onPauseTimer,
  onResumeTimer,
  userSkills,
  skillTags,
  onTagSkill,
  onRemoveSkillTag,
}: {
  currentDate: Date
  events: ICalendarEvent[]
  onDelete: (id: string) => void
  timeTotals: Record<string, number>
  activeTimers: Map<string, TimerState>
  /** Map<activityId, startedAt Date> — for live elapsed calculation (Story 5.9) */
  timerStartedAt: Map<string, Date>
  /** Timestamp updated by setInterval — causes re-render every second (Story 5.9) */
  elapsedTick: number
  onStartTimer: (activityId: string) => void
  onStopTimer: (activityId: string, entryId: string) => void
  onPauseTimer: (activityId: string, entryId: string) => void
  onResumeTimer: (activityId: string, entryId: string) => void
  /** Story 7.2 — Skill tag selector */
  userSkills: Skill[]
  skillTags: Record<string, string[]>
  onTagSkill: (activityId: string, skillId: string) => void
  onRemoveSkillTag: (activityId: string, skillId: string) => void
}) {
  const router = useRouter()
  const hours = getDayHourSlots(currentDate, 0, 24)
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
              {slotEvents.map((evt) => {
                const completedSeconds = timeTotals[evt.id] ?? 0
                const startedAt = timerStartedAt.get(evt.id)
                const isRunningTimer =
                  activeTimers.get(evt.id) !== undefined &&
                  !activeTimers.get(evt.id)!.isPaused &&
                  startedAt !== undefined
                // Live elapsed: completed + currently running session (Story 5.9)
                const elapsedSeconds = isRunningTimer
                  ? calcElapsedSeconds(startedAt!, new Date(elapsedTick))
                  : 0
                const totalForDisplay = completedSeconds + elapsedSeconds
                const formattedTime = isRunningTimer
                  ? formatElapsed(totalForDisplay)
                  : formatSeconds(completedSeconds)
                return (
                  <div
                    key={evt.id}
                    className={`group text-sm rounded border-l-2 px-2 py-1 ${EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{evt.title}</span>
                      {formattedTime && (
                        <span
                          className={`text-[10px] font-mono ${isRunningTimer ? 'text-primary animate-pulse' : 'text-muted-foreground'}`}
                        >
                          ⏱ {formattedTime}
                        </span>
                      )}
                    </div>
                    <EventActionButtons
                      evt={evt}
                      onCheckin={handleCheckin}
                      onDelete={onDelete}
                      timerState={activeTimers.get(evt.id)}
                      onStartTimer={onStartTimer}
                      onStopTimer={onStopTimer}
                      onPauseTimer={onPauseTimer}
                      onResumeTimer={onResumeTimer}
                    />
                    <SkillTagSection
                      activityId={evt.id}
                      userSkills={userSkills}
                      taggedSkillIds={skillTags[evt.id] ?? []}
                      onTagSkill={onTagSkill}
                      onRemoveSkillTag={onRemoveSkillTag}
                    />
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
            {dayEvents.map((evt) => {
              const durationMin = Math.round((evt.end.getTime() - evt.start.getTime()) / 60000)
              return (
                <div
                  key={evt.id}
                  className={`text-sm rounded border-l-2 px-3 py-1.5 flex items-center gap-3 ${EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
                >
                  <span className="text-xs text-muted-foreground shrink-0">
                    {format(evt.start, 'HH:mm')} · {formatDuration(durationMin)}
                  </span>
                  <span className="font-medium">{evt.title}</span>
                  {evt.description && (
                    <span className="text-xs text-muted-foreground/70 ml-auto shrink-0">
                      {evt.description}
                    </span>
                  )}
                </div>
              )
            })}
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
                const dayEventCount = getEventsForDay(events, day).length
                const inMonth = isSameMonth(day, monthDate)
                // Heatmap: 4 intensity levels based on event count (AC3 Story 5.5)
                const heatClass = isToday(day)
                  ? 'bg-primary text-primary-foreground font-bold'
                  : !inMonth
                    ? 'text-muted-foreground/30'
                    : dayEventCount === 0
                      ? 'text-foreground'
                      : dayEventCount <= 2
                        ? 'bg-primary/30 text-foreground'
                        : dayEventCount <= 5
                          ? 'bg-primary/60 text-foreground'
                          : 'bg-primary text-primary-foreground'
                return (
                  <div
                    key={day.toISOString()}
                    className={`text-center text-[10px] leading-5 rounded-full ${heatClass}`}
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

export function CalendarClient({
  events = [],
  defaultView = 'week',
  areas = [],
  timeTotals = {},
  initialActiveTimers = {},
  initialTimerStartedAt = {},
  userSkills = [],
  initialSkillTags = {},
}: CalendarClientProps) {
  const [view, setView] = useState<TCalendarView>(defaultView)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Timer state: Map<activityId, TimerState> — initialized from server-side active timers
  const [activeTimers, setActiveTimers] = useState<Map<string, TimerState>>(
    () =>
      new Map(
        Object.entries(initialActiveTimers).map(([activityId, entryId]) => [
          activityId,
          { entryId, isPaused: false },
        ])
      )
  )

  // Story 5.9 — Map<activityId, Date> for startedAt of the active session
  const [timerStartedAt, setTimerStartedAt] = useState<Map<string, Date>>(
    () =>
      new Map(
        Object.entries(initialTimerStartedAt).map(([activityId, iso]) => [
          activityId,
          new Date(iso),
        ])
      )
  )

  // Story 5.9 — Tick state: updated every second when there are active timers
  const [elapsedTick, setElapsedTick] = useState(() => Date.now())

  // Story 7.2 — Skill tags per activity (activityId → skillId[])
  const [skillTags, setSkillTags] = useState<Record<string, string[]>>(() => initialSkillTags)

  // Story 5.9 — AC1: Live clock — setInterval every 1s while any non-paused timer runs
  useEffect(() => {
    const hasRunning = Array.from(activeTimers.values()).some((t) => !t.isPaused)
    if (!hasRunning) return
    const interval = setInterval(() => setElapsedTick(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [activeTimers])

  // Story 5.9 — AC2: Supabase Realtime subscription for time_entries changes
  useEffect(() => {
    const supabase = createSupabaseBrowserClient()

    const channel = supabase
      .channel('timer-realtime-calendar')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'time_entries',
        },
        (payload) => {
          const record = (payload.new ?? payload.old) as {
            step_activity_id?: string
            is_active?: boolean
            started_at?: string
          }
          const activityId = record?.step_activity_id
          if (!activityId) return

          if (payload.eventType === 'INSERT' && record.is_active) {
            // New active timer started (possibly from another tab)
            const entryId = (payload.new as { id?: string }).id
            if (entryId) {
              setActiveTimers((prev) => new Map(prev).set(activityId, { entryId, isPaused: false }))
              if (record.started_at) {
                setTimerStartedAt((prev) =>
                  new Map(prev).set(activityId, new Date(record.started_at!))
                )
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updated = payload.new as {
              step_activity_id?: string
              is_active?: boolean
              paused_at?: string | null
              started_at?: string
              id?: string
            }
            if (!updated.is_active) {
              // Timer stopped or paused
              const hasPausedAt = updated.paused_at != null
              if (hasPausedAt) {
                // Paused: keep entry but mark isPaused
                const currentState = activeTimers.get(activityId)
                if (currentState) {
                  setActiveTimers((prev) =>
                    new Map(prev).set(activityId, { ...currentState, isPaused: true })
                  )
                }
              } else {
                // Stopped: remove from active timers and startedAt
                setActiveTimers((prev) => {
                  const m = new Map(prev)
                  m.delete(activityId)
                  return m
                })
                setTimerStartedAt((prev) => {
                  const m = new Map(prev)
                  m.delete(activityId)
                  return m
                })
              }
            }
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeTimers])

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

  function handleDelete(activityId: string) {
    // deleteActivity is a Server Action — called via startTransition in an inline async
    import('@/actions/calendar').then(({ deleteActivity }) => {
      deleteActivity(activityId).then((result) => {
        if (result.error) showToast(`Error: ${result.error}`)
      })
    })
  }

  // ─── Timer handlers (Story 5.8) ─────────────────────────────────────────────

  function handleStartTimer(activityId: string) {
    import('@/actions/timer').then(({ startTimer }) => {
      startTimer(activityId).then((result) => {
        if (result.error) {
          showToast(`Error: ${result.error}`)
        } else if (result.entryId) {
          const now = new Date()
          setActiveTimers((prev) =>
            new Map(prev).set(activityId, { entryId: result.entryId!, isPaused: false })
          )
          // Story 5.9: track startedAt for live elapsed
          setTimerStartedAt((prev) => new Map(prev).set(activityId, now))
        }
      })
    })
  }

  function handleStopTimer(activityId: string, entryId: string) {
    import('@/actions/timer').then(({ stopTimer }) => {
      stopTimer(entryId).then((result) => {
        if (result.error) {
          showToast(`Error: ${result.error}`)
        } else {
          setActiveTimers((prev) => {
            const m = new Map(prev)
            m.delete(activityId)
            return m
          })
          // Story 5.9: clear startedAt on stop
          setTimerStartedAt((prev) => {
            const m = new Map(prev)
            m.delete(activityId)
            return m
          })
        }
      })
    })
  }

  function handlePauseTimer(activityId: string, entryId: string) {
    const reason = window.prompt('¿Por qué pausas el timer? (requerido)')
    if (!reason || !reason.trim()) return // User cancelled or empty
    import('@/actions/timer').then(({ pauseTimer }) => {
      pauseTimer(entryId, reason).then((result) => {
        if (result.error) {
          showToast(`Error: ${result.error}`)
        } else {
          setActiveTimers((prev) => new Map(prev).set(activityId, { entryId, isPaused: true }))
          // Story 5.9: clear startedAt when paused (elapsed clock stops)
          setTimerStartedAt((prev) => {
            const m = new Map(prev)
            m.delete(activityId)
            return m
          })
        }
      })
    })
  }

  function handleResumeTimer(activityId: string, _pausedEntryId: string) {
    import('@/actions/timer').then(({ resumeTimer }) => {
      resumeTimer(_pausedEntryId).then((result) => {
        if (result.error) {
          showToast(`Error: ${result.error}`)
        } else if (result.entryId) {
          const now = new Date()
          setActiveTimers((prev) =>
            new Map(prev).set(activityId, { entryId: result.entryId!, isPaused: false })
          )
          // Story 5.9: new session startedAt on resume
          setTimerStartedAt((prev) => new Map(prev).set(activityId, now))
        }
      })
    })
  }

  // ─── Skill tag handlers (Story 7.2) ─────────────────────────────────────────

  function handleTagSkill(activityId: string, skillId: string) {
    import('@/actions/skills').then(({ tagActivityWithSkill }) => {
      tagActivityWithSkill(activityId, skillId).then((result) => {
        if (result.success) {
          setSkillTags((prev) => ({
            ...prev,
            [activityId]: [...(prev[activityId] ?? []), skillId],
          }))
        } else {
          showToast(`Error: ${result.error}`)
        }
      })
    })
  }

  function handleRemoveSkillTag(activityId: string, skillId: string) {
    import('@/actions/skills').then(({ removeSkillTag }) => {
      removeSkillTag(activityId, skillId).then((result) => {
        if (result.success) {
          setSkillTags((prev) => ({
            ...prev,
            [activityId]: (prev[activityId] ?? []).filter((id) => id !== skillId),
          }))
        } else {
          showToast(`Error: ${result.error}`)
        }
      })
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

        {/* Right side: Nueva Actividad + View selector */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsModalOpen(true)}
            aria-label="Nueva Actividad"
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Nueva Actividad
          </button>

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
      </div>

      {/* Time Budget panel — only in Day view (AC4 Story 5.2) */}
      {view === 'day' && <TimeBudgetPanel events={currentDayEvents} />}

      {/* Weekly Time Budget panel — only in Week view (AC3 Story 5.3) */}
      {view === 'week' && <WeeklyTimeBudgetPanel events={events} />}

      {/* Calendar body */}
      <div className="flex-1 overflow-auto">
        {view === 'week' && <WeekView currentDate={currentDate} events={events} />}
        {view === 'month' && <MonthView currentDate={currentDate} events={events} />}
        {view === 'day' && (
          <DayView
            currentDate={currentDate}
            events={events}
            onDelete={handleDelete}
            timeTotals={timeTotals}
            activeTimers={activeTimers}
            timerStartedAt={timerStartedAt}
            elapsedTick={elapsedTick}
            onStartTimer={handleStartTimer}
            onStopTimer={handleStopTimer}
            onPauseTimer={handlePauseTimer}
            onResumeTimer={handleResumeTimer}
            userSkills={userSkills}
            skillTags={skillTags}
            onTagSkill={handleTagSkill}
            onRemoveSkillTag={handleRemoveSkillTag}
          />
        )}
        {view === 'year' && <YearView currentDate={currentDate} events={events} />}
        {view === 'agenda' && <AgendaView currentDate={currentDate} events={events} />}
      </div>

      {/* New Activity Modal (AC1, AC2 Story 5.7) */}
      <NewActivityModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        defaultDate={currentDate}
        areas={areas}
      />
    </div>
  )
}
