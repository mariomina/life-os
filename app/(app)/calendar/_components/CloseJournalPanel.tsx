'use client'

// app/(app)/calendar/_components/CloseJournalPanel.tsx
// Story 10.18 — Diario de Cierre: muestra gaps de tiempo sin trackear del día actual.
// Se muestra cuando la hora actual >= umbral configurado (default 21:30).

import { useState, useCallback, useEffect } from 'react'
import { format } from 'date-fns'
import { Moon, X } from 'lucide-react'
import { detectDayGaps, type DayGap, type ICalendarEvent } from '@/lib/calendar/calendar-utils'
import { track } from '@/lib/analytics/track'

// ─── localStorage helpers ─────────────────────────────────────────────────────

const THRESHOLD_KEY = 'closeJournalHour'
const DEFAULT_THRESHOLD = '21:30'

function readThreshold(): string {
  try {
    return localStorage.getItem(THRESHOLD_KEY) ?? DEFAULT_THRESHOLD
  } catch {
    return DEFAULT_THRESHOLD
  }
}

function saveThreshold(value: string): void {
  try {
    localStorage.setItem(THRESHOLD_KEY, value)
  } catch {}
}

function thresholdToMin(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  if (isNaN(h) || isNaN(m)) return 21 * 60 + 30
  return h * 60 + m
}

function minToHHMM(min: number): string {
  const h = Math.floor(min / 60)
  const m = min % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatGapTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}min`
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface CloseJournalPanelProps {
  events: ICalendarEvent[]
  date: Date
  onDismiss: () => void
  onRegisterGap: (gapDate: Date, durationMin: number) => void
}

// ─── CloseJournalPanel ────────────────────────────────────────────────────────

export function CloseJournalPanel({
  events,
  date,
  onDismiss,
  onRegisterGap,
}: CloseJournalPanelProps) {
  const [threshold, setThreshold] = useState(readThreshold)

  const handleThresholdChange = useCallback((value: string) => {
    setThreshold(value)
    saveThreshold(value)
  }, [])

  const thresholdMin = thresholdToMin(threshold)
  const gaps = detectDayGaps(events, date, 5, thresholdMin)

  const totalUntracked = gaps.reduce((acc, g) => acc + g.durationMin, 0)

  // Story 10.19 — gap_panel_shown: track once when panel becomes visible
  useEffect(() => {
    track('gap_panel_shown', { gapCount: gaps.length, totalUntrackedMin: totalUntracked })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegister = useCallback(
    (gap: DayGap) => {
      track('gap_registered', { durationMin: gap.durationMin, fromMin: gap.from })
      const gapDate = new Date(date)
      gapDate.setHours(Math.floor(gap.from / 60), gap.from % 60, 0, 0)
      onRegisterGap(gapDate, gap.durationMin)
    },
    [date, onRegisterGap]
  )

  if (gaps.length === 0) return null

  return (
    <div className="sticky bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-sm shadow-lg px-4 py-3">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Moon className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-semibold">
              Cierre del día · {formatDuration(totalUntracked)} sin registrar
            </span>
          </div>
          <button
            onClick={onDismiss}
            className="p-1 rounded hover:bg-muted transition-colors"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Gap list */}
        <div className="flex flex-col gap-1 mb-3">
          {gaps.map((gap) => (
            <div
              key={`${gap.from}-${gap.to}`}
              className="flex items-center justify-between text-sm"
            >
              <span className="text-muted-foreground">
                {formatGapTime(gap.from)} – {formatGapTime(gap.to)} ·{' '}
                <span className="font-medium text-foreground">
                  {formatDuration(gap.durationMin)}
                </span>
              </span>
              <button
                className="text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors ml-4 shrink-0"
                onClick={() => handleRegister(gap)}
              >
                + Registrar
              </button>
            </div>
          ))}
        </div>

        {/* Footer: threshold + dismiss */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Umbral:</span>
          <input
            type="time"
            value={threshold}
            onChange={(e) => handleThresholdChange(e.target.value)}
            className="border border-border rounded px-1 py-0.5 text-xs bg-background focus:outline-none focus:ring-1 focus:ring-ring"
          />
          <button
            className="ml-auto text-xs px-2 py-1 rounded border border-border hover:bg-muted transition-colors"
            onClick={onDismiss}
          >
            Ignorar por hoy
          </button>
        </div>
      </div>
    </div>
  )
}
