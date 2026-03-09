'use client'

// app/(app)/calendar/_components/CalendarClient.tsx
// Client Component — big-calendar integration base.
// Implements the 5-view calendar (Day / Week / Month / Year / Agenda)
// using the types and structure from lramos33/big-calendar,
// adapted to Tailwind v4 and date-fns v4.
//
// Story 5.2: fix timezone (getUTCHours→getHours), Time Budget panel, action buttons.
// Story 5.8: time tracking — start/stop/pause/resume, time totals in DayView.

import { useState, useEffect, useCallback, useRef } from 'react'
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
  getEventsForRange,
  getWeekRange,
} from '@/lib/calendar/calendar-utils'
import { NewActivityModal } from './NewActivityModal'
import { EditActivityModal } from './EditActivityModal'
import { CalendarSidebar } from './CalendarSidebar'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import type { Skill } from '@/lib/db/schema/skills'
import type { Calendar } from '@/lib/db/queries/calendars'
import type { Holiday } from '@/lib/db/queries/holidays'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimerState {
  entryId: string
  isPaused: boolean
}

interface CalendarClientProps {
  events?: ICalendarEvent[]
  defaultView?: TCalendarView
  /** Calendars for the sidebar and activity picker (Story 10.2) */
  calendars?: Calendar[]
  /** Festivos del usuario para indicadores visuales y filtrado de 'workdays' (Story 10.6) */
  holidays?: Holiday[]
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

/** Altura fija de cada fila de hora en la vista semanal/diaria (h-14 = 3.5rem = 56px) */
const ROW_H = 56

/**
 * Calcula columnas para eventos solapados en la cuadrícula de tiempo.
 * Solo eventos con rangos de tiempo que se INTERSECTAN ESTRICTAMENTE se colocan
 * en columnas separadas. Eventos secuenciales (end A == start B) se apilan.
 */
function layoutEvents(events: ICalendarEvent[]): Map<string, { col: number; numCols: number }> {
  const result = new Map<string, { col: number; numCols: number }>()
  if (!events.length) return result

  const sorted = [...events].sort(
    (a, b) => a.start.getTime() - b.start.getTime() || b.end.getTime() - a.end.getTime()
  )

  // Solapamiento real: intersección estricta. end A == start B → secuencial, no se solapa.
  function overlaps(a: ICalendarEvent, b: ICalendarEvent): boolean {
    return a.start.getTime() < b.end.getTime() && b.start.getTime() < a.end.getTime()
  }

  // Greedy: columns[c] = end real del último evento en columna c.
  // Eventos secuenciales (end<=start) reutilizan la columna y se apilan verticalmente.
  const columns: number[] = []
  const colOf = new Map<string, number>()

  for (const evt of sorted) {
    const startMs = evt.start.getTime()
    let placed = -1
    for (let c = 0; c < columns.length; c++) {
      if (columns[c] <= startMs) {
        placed = c
        break
      }
    }
    if (placed === -1) {
      placed = columns.length
      columns.push(0)
    }
    columns[placed] = evt.end.getTime()
    colOf.set(evt.id, placed)
  }

  // numCols = máximo (col+1) entre los eventos que se solapan realmente con éste
  for (const evt of sorted) {
    const col = colOf.get(evt.id)!
    let numCols = col + 1
    for (const other of sorted) {
      if (other.id !== evt.id && overlaps(evt, other)) {
        numCols = Math.max(numCols, colOf.get(other.id)! + 1)
      }
    }
    result.set(evt.id, { col, numCols })
  }

  return result
}

// ─── Event color helpers (Story 10.2 AC5) ────────────────────────────────────

/**
 * Returns inline style for an event using calendarColor (hex) if available,
 * falling back to the Tailwind class for area color.
 * Tailwind v4 cannot generate dynamic classes, so hex colors use inline styles.
 */
function getEventColorStyle(calendarColor: string | undefined): React.CSSProperties | undefined {
  if (!calendarColor) return undefined
  return {
    backgroundColor: `${calendarColor}33`, // 20% opacity
    borderColor: calendarColor,
    color: calendarColor,
  }
}

// ─── Time Budget helpers ───────────────────────────────────────────────────────

const AVAILABLE_MINUTES = 24 * 60 // 24h = 1440 min (daily)
const AVAILABLE_WEEKLY_MINUTES = 24 * 60 * 7 // 24h × 7 days = 10080 min (weekly)

export function calcTimeBudget(events: ICalendarEvent[]) {
  const committed = events.reduce((acc, e) => {
    if (e.isAllDay) return acc
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
    if (e.isAllDay) return acc
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
  if (h === 0) return `${m}m`
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Formato largo para semana: convierte minutos a días+horas+minutos */
function formatMinutesWeekly(minutes: number): string {
  const abs = Math.abs(minutes)
  const d = Math.floor(abs / (24 * 60))
  const h = Math.floor((abs % (24 * 60)) / 60)
  const m = Math.round(abs % 60)
  if (d > 0 && h === 0 && m === 0) return `${d}d`
  if (d > 0 && m === 0) return `${d}d ${h}h`
  if (d > 0) return `${d}d ${h}h ${m}m`
  if (h > 0 && m === 0) return `${h}h`
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

// ─── Time Budget Panel (AC4) ───────────────────────────────────────────────────

function TimeBudgetPanel({ events }: { events: ICalendarEvent[] }) {
  const { committed, free } = calcTimeBudget(events)
  const isOvercommitted = free < 0

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-b border-border bg-muted/30 text-sm">
      <span className="font-medium text-foreground shrink-0">Time Budget</span>
      <span className="text-muted-foreground">
        Total: <span className="font-semibold text-foreground">24h</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">
        Comprometido:{' '}
        <span className="font-semibold text-foreground">{formatMinutes(committed)}</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">
        Libre:{' '}
        <span
          className={`font-semibold ${isOvercommitted ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}
        >
          {isOvercommitted ? '-' : ''}
          {formatMinutes(Math.abs(free))}
        </span>
      </span>
    </div>
  )
}

// ─── Weekly Time Budget Panel (AC3 Story 5.3) ─────────────────────────────────

function WeeklyTimeBudgetPanel({ events }: { events: ICalendarEvent[] }) {
  const { committed, free } = calcWeeklyTimeBudget(events)
  const isOvercommitted = free < 0

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 border-b border-border bg-muted/30 text-sm">
      <span className="font-medium text-foreground shrink-0">Time Budget Semanal</span>
      <span className="text-muted-foreground">
        Total: <span className="font-semibold text-foreground">7d</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">
        Comprometido:{' '}
        <span className="font-semibold text-foreground">{formatMinutesWeekly(committed)}</span>
      </span>
      <span className="text-muted-foreground">·</span>
      <span className="text-muted-foreground">
        Libre:{' '}
        <span
          className={`font-semibold ${isOvercommitted ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}
        >
          {isOvercommitted ? '-' : ''}
          {formatMinutesWeekly(Math.abs(free))}
        </span>
      </span>
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

function WeekView({
  currentDate,
  events,
  onSlotClick,
  onEventClick,
  onEventDrop,
  holidays = [],
}: {
  currentDate: Date
  events: ICalendarEvent[]
  onSlotClick: (day: Date, hour: number) => void
  onEventClick: (evt: ICalendarEvent, day: Date, totalDayEvents: number) => void
  onEventDrop: (eventId: string, day: Date, hour: number) => void
  holidays?: Holiday[]
}) {
  const [dragOver, setDragOver] = useState<{ dayKey: string; hour: number } | null>(null)
  const weekJustDropped = useRef(false)
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 })
  const weekDays = eachDayOfInterval({
    start: weekStart,
    end: endOfWeek(currentDate, { weekStartsOn: 1 }),
  })
  const hours = getDayHourSlots(currentDate, 0, 24)
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]))

  return (
    <div className="overflow-auto">
      {/* Day headers */}
      <div className="grid grid-cols-8 border-b border-border sticky top-0 bg-background z-10">
        <div className="p-2" /> {/* Time gutter */}
        {weekDays.map((day) => {
          const holidayName = holidayMap.get(format(day, 'yyyy-MM-dd'))
          return (
            <div
              key={day.toISOString()}
              className={`p-2 text-center text-xs font-medium border-l border-border ${
                isToday(day) ? 'text-primary font-bold' : 'text-muted-foreground'
              } ${holidayName ? 'bg-orange-50/80 dark:bg-orange-950/30' : ''}`}
            >
              <div>{format(day, 'EEE', { locale: es })}</div>
              <div
                className={`text-lg leading-tight ${isToday(day) ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 flex items-center justify-center mx-auto' : ''}`}
              >
                {format(day, 'd')}
              </div>
              {holidayName && (
                <div
                  className="text-[9px] text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 rounded px-0.5 mt-0.5 truncate leading-tight"
                  title={holidayName}
                >
                  {holidayName}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* All-day events row — one row per unique all-day event across the week */}
      {weekDays.some((day) => getEventsForDay(events, day).some((e) => e.isAllDay)) && (
        <div className="grid grid-cols-8 border-b border-border bg-muted/5">
          <div className="p-1 text-right text-[10px] text-muted-foreground self-center pr-2 leading-tight">
            Todo
            <br />
            el día
          </div>
          {weekDays.map((day) => {
            const allDayEvts = getEventsForDay(events, day).filter((e) => e.isAllDay)
            return (
              <div
                key={day.toISOString()}
                className="border-l border-border/50 p-0.5 flex flex-col gap-0.5 min-h-[20px]"
              >
                {allDayEvts.map((evt) => {
                  const color = evt.calendarColor ?? '#6366f1'
                  return (
                    <button
                      key={evt.id}
                      onClick={() => onEventClick(evt, day, allDayEvts.length)}
                      title={evt.title}
                      className="w-full rounded px-1 py-0.5 text-[10px] font-semibold truncate text-left hover:brightness-110 transition-all"
                      style={{
                        backgroundColor: color + '22',
                        color,
                        borderLeft: `2px solid ${color}`,
                      }}
                    >
                      {evt.title}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}

      {/* Time grid */}
      <div className="relative" style={{ height: `${24 * ROW_H}px` }}>
        {/* Background: hour rows for grid lines + slot click areas */}
        {hours.map((hour) => (
          <div
            key={hour.toISOString()}
            className="absolute left-0 right-0 grid grid-cols-8 border-b border-border/50"
            style={{ top: `${hour.getHours() * ROW_H}px`, height: `${ROW_H}px` }}
          >
            <div className="p-1 pr-2 text-right text-xs text-muted-foreground self-start">
              {format(hour, 'HH:mm')}
            </div>
            {weekDays.map((day) => {
              const isDragTarget =
                dragOver?.dayKey === day.toISOString() && dragOver?.hour === hour.getHours()
              return (
                <div
                  key={day.toISOString()}
                  className={`border-l border-border/50 cursor-pointer transition-colors ${isDragTarget ? 'bg-primary/15' : 'hover:bg-primary/5'}`}
                  onClick={() => {
                    if (weekJustDropped.current) return
                    onSlotClick(day, hour.getHours())
                  }}
                  onDragOver={(e) => {
                    e.preventDefault()
                    setDragOver({ dayKey: day.toISOString(), hour: hour.getHours() })
                  }}
                  onDrop={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    weekJustDropped.current = true
                    setTimeout(() => {
                      weekJustDropped.current = false
                    }, 300)
                    const eventId = e.dataTransfer.getData('text/plain')
                    if (eventId) onEventDrop(eventId, day, hour.getHours())
                    setDragOver(null)
                  }}
                />
              )
            })}
          </div>
        ))}

        {/* Events overlay — absolutely positioned on top of the grid */}
        <div className="absolute inset-0 grid grid-cols-8 pointer-events-none">
          <div /> {/* time gutter spacer */}
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(events, day).filter((e) => !e.isAllDay)
            return (
              <div
                key={day.toISOString()}
                className="relative border-l border-transparent pointer-events-none"
              >
                {dayEvents.map((evt) => {
                  const startH = evt.start.getHours() + evt.start.getMinutes() / 60
                  const durationH = (evt.end.getTime() - evt.start.getTime()) / 3600000
                  const top = startH * ROW_H
                  const height = Math.max(14, Math.min(durationH, 24 - startH) * ROW_H)
                  const hexStyle = getEventColorStyle(evt.calendarColor)
                  return (
                    <div
                      key={evt.id}
                      data-event
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('text/plain', evt.id)
                        e.stopPropagation()
                      }}
                      onDragEnd={() => setDragOver(null)}
                      className={`absolute left-0.5 right-0.5 rounded border-l-2 px-1 py-0.5 text-xs overflow-hidden pointer-events-auto cursor-grab active:cursor-grabbing hover:brightness-110 transition-all ${
                        hexStyle ? '' : EVENT_COLOR_CLASSES[evt.color ?? 'blue']
                      }`}
                      style={{ top, height, ...(hexStyle ?? {}) }}
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick(evt, day, dayEvents.length)
                      }}
                    >
                      <div className="font-medium truncate leading-tight">{evt.title}</div>
                      {height >= 36 && (
                        <div className="text-[10px] opacity-70 leading-tight">
                          {format(evt.start, 'HH:mm')}–{format(evt.end, 'HH:mm')}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function MonthView({
  currentDate,
  events,
  holidays = [],
  onSlotClick,
  onEventClick,
}: {
  currentDate: Date
  events: ICalendarEvent[]
  holidays?: Holiday[]
  onSlotClick?: (date: Date) => void
  onEventClick?: (evt: ICalendarEvent) => void
}) {
  const days = getMonthGridDays(currentDate)
  const dayNames = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
  // Story 10.6 — Map<'YYYY-MM-DD', name> for quick holiday lookup
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]))

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
          const holidayName = holidayMap.get(format(day, 'yyyy-MM-dd'))
          return (
            <div
              key={day.toISOString()}
              title={holidayName}
              onClick={() => onSlotClick?.(day)}
              className={`group relative min-h-24 border-b border-r border-border p-1 cursor-pointer transition-colors hover:bg-muted/40 ${
                !inCurrentMonth
                  ? 'bg-muted/30'
                  : holidayName
                    ? 'bg-orange-50/70 dark:bg-orange-950/25'
                    : ''
              }`}
            >
              {/* Header row: number + "+" button */}
              <div className="flex items-center justify-between">
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
                {inCurrentMonth && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSlotClick?.(day)
                    }}
                    aria-label={`Nueva actividad el ${format(day, 'd MMM')}`}
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-4 w-4 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted"
                  >
                    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="currentColor">
                      <path
                        d="M6 1v10M1 6h10"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </button>
                )}
              </div>

              {/* Story 10.6 — Holiday badge */}
              {inCurrentMonth && holidayName && (
                <div className="text-[9px] text-orange-600 dark:text-orange-400 bg-orange-100 dark:bg-orange-900/40 rounded px-0.5 mt-0.5 truncate leading-tight">
                  {holidayName}
                </div>
              )}
              {/* Dot indicator (AC3 Story 5.4) — visible only for days in current month with events */}
              {inCurrentMonth && dayEvents.length > 0 && (
                <div className="w-1 h-1 rounded-full bg-primary mx-auto mt-0.5" />
              )}
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((evt) => {
                  const hexStyle = getEventColorStyle(evt.calendarColor)
                  return (
                    <button
                      key={evt.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEventClick?.(evt)
                      }}
                      className={`w-full text-left text-xs rounded px-1 truncate border-l-2 hover:brightness-110 transition-all ${hexStyle ? '' : EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
                      style={hexStyle}
                    >
                      {evt.title}
                    </button>
                  )
                })}
                {dayEvents.length > 3 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onSlotClick?.(day)
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground"
                  >
                    +{dayEvents.length - 3} más
                  </button>
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
  onSlotClick,
  onEventClick,
  onEventDrop,
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
  holidays = [],
}: {
  currentDate: Date
  events: ICalendarEvent[]
  onSlotClick: (date: Date, hour: number) => void
  onEventClick: (evt: ICalendarEvent) => void
  onEventDrop: (eventId: string, day: Date, hour: number) => void
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
  holidays?: Holiday[]
}) {
  const router = useRouter()
  const [dragOverHour, setDragOverHour] = useState<number | null>(null)
  const dayJustDropped = useRef(false)
  const hours = getDayHourSlots(currentDate, 0, 24)
  const allDayForDay = getEventsForDay(events, currentDate).filter((e) => e.isAllDay)
  const dayEvents = getEventsForDay(events, currentDate).filter((e) => !e.isAllDay)
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]))
  const holidayName = holidayMap.get(format(currentDate, 'yyyy-MM-dd'))

  function handleCheckin(activityId: string) {
    router.push(`/checkin?activityId=${activityId}`)
  }

  return (
    <div className="overflow-auto">
      {/* Holiday banner */}
      {holidayName && (
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-50 dark:bg-orange-950/30 border-b border-orange-200 dark:border-orange-800 text-sm text-orange-700 dark:text-orange-400">
          <span className="font-semibold">{holidayName}</span>
          <span className="text-xs opacity-70">— Feriado Ecuador</span>
        </div>
      )}
      {/* All-day event banners — same style as holiday banner */}
      {allDayForDay.map((evt) => {
        const color = evt.calendarColor ?? '#6366f1'
        return (
          <button
            key={evt.id}
            onClick={() => onEventClick(evt)}
            className="w-full flex items-center gap-2 px-4 py-2 border-b text-sm font-semibold text-left hover:brightness-110 transition-all"
            style={{
              backgroundColor: color + '22',
              borderColor: color + '55',
              color,
            }}
          >
            <span>{evt.title}</span>
            {evt.calendarName && (
              <span className="text-xs font-normal opacity-70">— {evt.calendarName}</span>
            )}
          </button>
        )
      })}

      {/* 24h grid with absolute-positioned event spanning */}
      <div className="relative" style={{ height: `${24 * ROW_H}px` }}>
        {/* Background: hour rows for grid lines + click areas */}
        {hours.map((hour) => (
          <div
            key={hour.toISOString()}
            className="absolute left-0 right-0 flex border-b border-border/50"
            style={{ top: `${hour.getHours() * ROW_H}px`, height: `${ROW_H}px` }}
          >
            <div className="w-16 p-1 pr-2 text-right text-xs text-muted-foreground shrink-0 self-start">
              {format(hour, 'HH:mm')}
            </div>
            <div
              className={`flex-1 border-l border-border/50 cursor-pointer transition-colors ${dragOverHour === hour.getHours() ? 'bg-primary/15' : 'hover:bg-primary/5'}`}
              onClick={() => {
                if (dayJustDropped.current) return
                onSlotClick(currentDate, hour.getHours())
              }}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverHour(hour.getHours())
              }}
              onDrop={(e) => {
                e.preventDefault()
                e.stopPropagation()
                dayJustDropped.current = true
                setTimeout(() => {
                  dayJustDropped.current = false
                }, 300)
                const eventId = e.dataTransfer.getData('text/plain')
                if (eventId) onEventDrop(eventId, currentDate, hour.getHours())
                setDragOverHour(null)
              }}
            />
          </div>
        ))}

        {/* Events overlay — absolutely positioned, span full duration */}
        <div className="absolute left-16 right-0 top-0 bottom-0 pointer-events-none">
          {(() => {
            const layout = layoutEvents(dayEvents)
            return dayEvents.map((evt) => {
              const startH = evt.start.getHours() + evt.start.getMinutes() / 60
              const durationH = (evt.end.getTime() - evt.start.getTime()) / 3600000
              const top = startH * ROW_H
              // Mínimo 14px (= 1 línea de texto) — eventos de 15min terminan exactamente
              // donde empieza el siguiente, sin overlap visual
              const height = Math.max(14, Math.min(durationH, 24 - startH) * ROW_H)

              const { col, numCols } = layout.get(evt.id) ?? { col: 0, numCols: 1 }
              const pct = 100 / numCols
              const leftPct = col * pct
              const widthPct = pct - (numCols > 1 ? 0.5 : 0)

              const completedSeconds = timeTotals[evt.id] ?? 0
              const startedAt = timerStartedAt.get(evt.id)
              const isRunningTimer =
                activeTimers.get(evt.id) !== undefined &&
                !activeTimers.get(evt.id)!.isPaused &&
                startedAt !== undefined
              const elapsedSeconds = isRunningTimer
                ? calcElapsedSeconds(startedAt!, new Date(elapsedTick))
                : 0
              const totalForDisplay = completedSeconds + elapsedSeconds
              const formattedTime = isRunningTimer
                ? formatElapsed(totalForDisplay)
                : formatSeconds(completedSeconds)
              const hexStyle = getEventColorStyle(evt.calendarColor)

              return (
                <div
                  key={evt.id}
                  data-event
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('text/plain', evt.id)
                    e.stopPropagation()
                  }}
                  onDragEnd={() => setDragOverHour(null)}
                  className={`absolute text-sm rounded border-l-2 px-2 py-1 overflow-hidden pointer-events-auto cursor-grab active:cursor-grabbing hover:brightness-105 transition-all ${hexStyle ? '' : EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
                  style={{
                    top,
                    height,
                    left: `${leftPct}%`,
                    width: `${widthPct}%`,
                    ...(hexStyle ?? {}),
                  }}
                  onClick={(e) => {
                    if ((e.target as HTMLElement).closest('button,select')) return
                    e.stopPropagation()
                    onEventClick(evt)
                  }}
                >
                  <div className="leading-tight">
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium truncate text-sm">{evt.title}</span>
                      {isRunningTimer && formattedTime && (
                        <span className="text-[10px] font-mono shrink-0 text-primary animate-pulse">
                          ⏱ {formattedTime}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] opacity-75 mt-0.5">
                      {format(evt.start, 'HH:mm')} – {format(evt.end, 'HH:mm')}
                    </div>
                  </div>
                  {evt.description && height >= 72 && (
                    <div className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                      {evt.description}
                    </div>
                  )}
                  {height >= 48 && (
                    <>
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
                    </>
                  )}
                </div>
              )
            })
          })()}
        </div>
      </div>
    </div>
  )
}

function AgendaView({
  currentDate,
  events,
  holidays = [],
  onEventClick,
}: {
  currentDate: Date
  events: ICalendarEvent[]
  holidays?: Holiday[]
  onEventClick: (evt: ICalendarEvent) => void
}) {
  const next30Days = eachDayOfInterval({
    start: currentDate,
    end: addDays(currentDate, 29),
  })
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]))

  // Include days that have events OR are holidays
  const daysToShow = next30Days
    .map((day) => ({
      day,
      events: getEventsForDay(events, day),
      holidayName: holidayMap.get(format(day, 'yyyy-MM-dd')),
    }))
    .filter(({ events, holidayName }) => events.length > 0 || !!holidayName)

  if (daysToShow.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-muted-foreground text-sm">
        No hay eventos en los próximos 30 días
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4">
      {daysToShow.map(({ day, events: dayEvents, holidayName }) => (
        <div key={day.toISOString()}>
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <span
              className={`text-sm font-semibold ${isToday(day) ? 'text-primary' : 'text-foreground'}`}
            >
              {format(day, "EEEE, d 'de' MMMM", { locale: es })}
            </span>
            {isToday(day) && (
              <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                Hoy
              </span>
            )}
            {holidayName && (
              <span className="text-xs bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 px-1.5 py-0.5 rounded">
                {holidayName}
              </span>
            )}
          </div>
          <div className="space-y-1 pl-4">
            {dayEvents.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Sin actividades programadas</p>
            )}
            {dayEvents.map((evt) => {
              const durationMin = Math.round((evt.end.getTime() - evt.start.getTime()) / 60000)
              const hexStyle = getEventColorStyle(evt.calendarColor)
              return (
                <div
                  key={evt.id}
                  className={`text-sm rounded border-l-2 px-3 py-1.5 flex items-center gap-3 cursor-pointer hover:brightness-105 transition-all ${hexStyle ? '' : EVENT_COLOR_CLASSES[evt.color ?? 'blue']}`}
                  style={hexStyle}
                  onClick={() => onEventClick(evt)}
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

function YearView({
  currentDate,
  events,
  holidays = [],
  onDayClick,
}: {
  currentDate: Date
  events: ICalendarEvent[]
  holidays?: Holiday[]
  onDayClick?: (date: Date) => void
}) {
  const year = currentDate.getFullYear()
  const months = Array.from({ length: 12 }, (_, i) => new Date(year, i, 1))
  const holidayMap = new Map(holidays.map((h) => [h.date, h.name]))

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
                const inMonth = isSameMonth(day, monthDate)
                const dayKey = format(day, 'yyyy-MM-dd')
                const isHoliday = !!holidayMap.get(dayKey)
                const dayAllEvents = getEventsForDay(events, day)
                const allDayEvts = dayAllEvents.filter((e) => e.isAllDay)
                const regularEvts = dayAllEvents.filter((e) => !e.isAllDay)

                // Puntos de colores para eventos normales (máx 3, colores únicos por calendario)
                const dotColors = [...new Set(regularEvts.map((e) => e.calendarColor ?? '#6366f1'))]

                // Resaltado de fondo: solo hoy / festivo / todo-el-día
                const bgClass = isToday(day)
                  ? 'bg-primary text-primary-foreground font-bold'
                  : !inMonth
                    ? 'text-muted-foreground/30'
                    : isHoliday
                      ? 'bg-orange-400/70 text-white dark:bg-orange-600/60 dark:text-white'
                      : allDayEvts.length > 0
                        ? 'bg-pink-400/70 text-white dark:bg-pink-600/60 dark:text-white'
                        : 'text-foreground'

                const tooltipTitle = isHoliday
                  ? holidayMap.get(dayKey)
                  : allDayEvts.length > 0
                    ? allDayEvts.map((e) => e.title).join(', ')
                    : inMonth
                      ? `Ver día ${format(day, 'd MMM yyyy')}`
                      : undefined

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    title={tooltipTitle}
                    onClick={() => inMonth && onDayClick?.(day)}
                    disabled={!inMonth}
                    className={`flex flex-col items-center justify-center h-6 w-full text-[10px] leading-none rounded-sm transition-transform ${inMonth ? 'cursor-pointer hover:scale-110 hover:ring-1 hover:ring-primary/50' : 'cursor-default'} ${bgClass}`}
                  >
                    <span>{inMonth ? format(day, 'd') : ''}</span>
                    {/* Fila de puntos — siempre renderizada (h-[5px]) para mantener altura constante */}
                    <span className="flex gap-px h-[5px] items-center mt-px">
                      {inMonth &&
                        dotColors
                          .slice(0, 3)
                          .map((color) => (
                            <span
                              key={color}
                              className="w-[3px] h-[3px] rounded-full"
                              style={{ backgroundColor: color }}
                            />
                          ))}
                    </span>
                  </button>
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
  calendars = [],
  holidays = [],
  timeTotals = {},
  initialActiveTimers = {},
  initialTimerStartedAt = {},
  userSkills = [],
  initialSkillTags = {},
}: CalendarClientProps) {
  const router = useRouter()
  const [view, setView] = useState<TCalendarView>(defaultView)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [isModalOpen, setIsModalOpen] = useState(false)
  // Story 10.4 — date+hour from clicking a grid slot (null = use currentDate)
  const [clickedSlot, setClickedSlot] = useState<Date | null>(null)
  // Story 10.9 — selected event to edit/delete
  const [selectedEvent, setSelectedEvent] = useState<ICalendarEvent | null>(null)

  // Story 10.2 AC3 — hidden calendars filter (state lives here, set by CalendarSidebar)
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<Set<string>>(new Set())

  // Filter events by hidden calendars
  const visibleEvents = events.filter((e) => !e.calendarId || !hiddenCalendarIds.has(e.calendarId))

  // Story 10.10: si el calendario "Feriados/Festivos" está oculto, no mostrar festivos
  const holidayCalendar = calendars?.find(
    (c) => c.name.toLowerCase().includes('feriado') || c.name.toLowerCase().includes('festivo')
  )
  const visibleHolidays =
    holidayCalendar && hiddenCalendarIds.has(holidayCalendar.id) ? [] : (holidays ?? [])

  const handleVisibilityChange = useCallback((hidden: Set<string>) => {
    setHiddenCalendarIds(new Set(hidden))
  }, [])

  // Story 10.4 — click on an empty grid slot to open the modal with that date+hour
  const handleSlotClick = useCallback((date: Date, hour: number) => {
    const slot = new Date(date)
    slot.setHours(hour, 0, 0, 0)
    setClickedSlot(slot)
    setIsModalOpen(true)
  }, [])

  // MonthView: click on a day cell → open new activity modal at 8:00
  const handleMonthSlotClick = useCallback((date: Date) => {
    const slot = new Date(date)
    slot.setHours(8, 0, 0, 0)
    setClickedSlot(slot)
    setIsModalOpen(true)
  }, [])

  // YearView: click on a day → navigate to that day in DayView
  const handleYearDayClick = useCallback((date: Date) => {
    setCurrentDate(date)
    setView('day')
  }, [])

  // Click on an event (WeekView, DayView, AgendaView) → open edit modal
  const handleEventClick = useCallback((evt: ICalendarEvent) => {
    setSelectedEvent(evt)
  }, [])

  // Click on an event in WeekView → open edit modal (wrapper with WeekView signature)
  const handleWeekEventClick = useCallback(
    (evt: ICalendarEvent, _day: Date, _totalDayEvents: number) => {
      setSelectedEvent(evt)
    },
    []
  )

  // Story 10.11 — Drag & Drop: move an activity to a new day/hour
  const handleDropEvent = useCallback(
    async (eventId: string, targetDay: Date, targetHour: number) => {
      const evt = visibleEvents.find((e) => e.id === eventId)
      if (!evt) return
      const { updateActivity } = await import('@/actions/calendar')
      await updateActivity(eventId, {
        title: evt.title,
        description: evt.description ?? null,
        date: format(targetDay, 'yyyy-MM-dd'),
        time: `${String(targetHour).padStart(2, '0')}:00`,
        duration: Math.round((evt.end.getTime() - evt.start.getTime()) / 60000),
        areaId: evt.areaId ?? null,
        calendarId: evt.calendarId ?? null,
      })
      router.refresh()
    },
    [visibleEvents, router]
  )

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
  const currentDayEvents = getEventsForDay(visibleEvents, currentDate)

  // Events for the currently displayed week — used by Weekly Time Budget panel
  const currentWeekEvents = getEventsForRange(visibleEvents, getWeekRange(currentDate))

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
    <div className="flex h-full">
      {/* Calendar Sidebar (Story 10.2) */}
      {calendars.length > 0 && (
        <CalendarSidebar calendars={calendars} onVisibilityChange={handleVisibilityChange} />
      )}

      {/* Calendar canvas */}
      <div className="flex flex-col flex-1 min-w-0 rounded-none border border-border bg-card overflow-hidden shadow-[0_1px_3px_rgb(0_0_0/0.06)]">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          {/* Navigation */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('today')}
              className="rounded-xl border border-border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              Hoy
            </button>
            <button
              onClick={() => navigate('prev')}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              aria-label="Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigate('next')}
              className="rounded-xl p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
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
              className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
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
        {view === 'week' && <WeeklyTimeBudgetPanel events={currentWeekEvents} />}

        {/* Calendar body */}
        <div className="flex-1 overflow-auto">
          {view === 'week' && (
            <WeekView
              currentDate={currentDate}
              events={visibleEvents}
              onSlotClick={handleSlotClick}
              onEventClick={handleWeekEventClick}
              onEventDrop={handleDropEvent}
              holidays={visibleHolidays}
            />
          )}
          {view === 'month' && (
            <MonthView
              currentDate={currentDate}
              events={visibleEvents}
              holidays={visibleHolidays}
              onSlotClick={handleMonthSlotClick}
              onEventClick={handleEventClick}
            />
          )}
          {view === 'day' && (
            <DayView
              currentDate={currentDate}
              events={visibleEvents}
              onSlotClick={handleSlotClick}
              onEventClick={handleEventClick}
              onEventDrop={handleDropEvent}
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
              holidays={visibleHolidays}
            />
          )}
          {view === 'year' && (
            <YearView
              currentDate={currentDate}
              events={visibleEvents}
              holidays={visibleHolidays}
              onDayClick={handleYearDayClick}
            />
          )}
          {view === 'agenda' && (
            <AgendaView
              currentDate={currentDate}
              events={visibleEvents}
              holidays={visibleHolidays}
              onEventClick={handleEventClick}
            />
          )}
        </div>

        {/* New Activity Modal (AC1, AC2 Story 5.7 / Story 10.4)
            Conditionally rendered so the modal component mounts fresh on each open
            (clean state for recurrence fields) and unmounts on close. */}
        {isModalOpen && (
          <NewActivityModal
            onClose={() => {
              setIsModalOpen(false)
              setClickedSlot(null)
            }}
            defaultDate={clickedSlot ?? currentDate}
            calendars={calendars}
          />
        )}

        {/* Edit Activity Modal (Story 10.9) */}
        {selectedEvent && (
          <EditActivityModal
            event={selectedEvent}
            onClose={() => setSelectedEvent(null)}
            calendars={calendars}
          />
        )}
      </div>
    </div>
  )
}
