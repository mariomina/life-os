'use client'

// app/(app)/reports/_components/TimeByCalendarWidget.tsx
// Widget "Tiempo por Calendario" — Story 10.3.
// Selector de rango independiente; fetch propio vía server action.

import { useState, useTransition, useEffect } from 'react'
import { getTimeByCalendarReport } from '@/actions/calendars'
import type { CalendarTimeData } from '@/lib/db/queries/calendars'
import type { ReportPeriod } from '@/features/reports/periods'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ─── Period pills config ──────────────────────────────────────────────────────

const RANGE_OPTIONS: { label: string; value: ReportPeriod }[] = [
  { label: 'Esta semana', value: 'week' },
  { label: 'Este mes', value: 'month' },
  { label: 'Este trimestre', value: 'quarter' },
]

// ─── TimeByCalendarWidget ─────────────────────────────────────────────────────

interface TimeByCalendarWidgetProps {
  initialData: CalendarTimeData[]
  initialPeriod?: ReportPeriod
}

export function TimeByCalendarWidget({
  initialData,
  initialPeriod = 'month',
}: TimeByCalendarWidgetProps) {
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod)
  const [data, setData] = useState<CalendarTimeData[]>(initialData)
  const [isPending, startTransition] = useTransition()

  // Refetch when period changes
  useEffect(() => {
    startTransition(async () => {
      const result = await getTimeByCalendarReport(period)
      setData(result)
    })
  }, [period])

  const maxSeconds = data.length > 0 ? Math.max(...data.map((r) => r.totalSeconds)) : 1

  return (
    <section className="rounded-lg border p-4 space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-base font-semibold">Tiempo por Calendario</h2>

        {/* Range pills */}
        <div className="flex gap-1.5 flex-wrap">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPeriod(opt.value)}
              disabled={isPending}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors disabled:opacity-50 ${
                period === opt.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {isPending ? (
        <p className="text-sm text-muted-foreground animate-pulse py-2">Calculando...</p>
      ) : data.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          Sin actividades con tiempo registrado en este período.
        </p>
      ) : (
        <div className="space-y-3">
          {data.map((row) => {
            const barWidth = Math.round((row.totalSeconds / maxSeconds) * 100)
            return (
              <div key={row.calendarId ?? '__none__'} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: row.calendarColor }}
                    />
                    <span className="truncate font-medium">{row.calendarName}</span>
                  </span>
                  <span className="text-muted-foreground tabular-nums shrink-0 ml-2">
                    {formatSeconds(row.totalSeconds)}{' '}
                    <span className="text-xs">({row.percentage}%)</span>
                  </span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${barWidth}%`,
                      backgroundColor: row.calendarColor,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
