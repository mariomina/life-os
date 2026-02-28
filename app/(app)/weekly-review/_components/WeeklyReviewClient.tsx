'use client'

// app/(app)/weekly-review/_components/WeeklyReviewClient.tsx
// Story 8.8 — Weekly Review wizard: 4 fases (Medir → Analizar → Planificar → Confirmar).

import { useState } from 'react'
import type { WeeklyReviewData } from '@/actions/weekly-review'

// ─── Phase Indicator ──────────────────────────────────────────────────────────

const PHASE_LABELS = ['Medir', 'Analizar', 'Planificar', 'Confirmar']

function PhaseIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 text-sm">
      {PHASE_LABELS.map((label, idx) => {
        const phase = idx + 1
        const isActive = phase === current
        const isDone = phase < current
        return (
          <div key={phase} className="flex items-center gap-1">
            <div
              className={[
                'flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors',
                isDone
                  ? 'bg-green-500 text-white'
                  : isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
              ].join(' ')}
            >
              {isDone ? '✓' : phase}
            </div>
            <span
              className={[
                'hidden sm:inline text-xs',
                isActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
              ].join(' ')}
            >
              {label}
            </span>
            {phase < 4 && <div className="h-px w-4 bg-muted" />}
          </div>
        )
      })}
    </div>
  )
}

// ─── Format helpers ───────────────────────────────────────────────────────────

function pct(rate: number | null): string {
  if (rate === null) return 'n/d'
  return `${Math.round(rate * 100)}%`
}

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

// ─── Phase 1: Medir ───────────────────────────────────────────────────────────

function MeasurePhase({ data }: { data: WeeklyReviewData }) {
  const { metrics } = data
  const trendIcons: Record<string, string> = { improving: '↑', declining: '↓', stable: '→' }
  const trendColors: Record<string, string> = {
    improving: 'text-green-600',
    declining: 'text-red-500',
    stable: 'text-muted-foreground',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Fase 1: Medir</h2>
        <p className="text-sm text-muted-foreground">Métricas automáticas de la última semana.</p>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{pct(metrics.ccrRate)}</p>
          <p className="text-xs text-muted-foreground mt-1">CCR</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{pct(metrics.habitConsistencyAvg)}</p>
          <p className="text-xs text-muted-foreground mt-1">Hábitos</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{Math.round(metrics.okrProgressAvg)}%</p>
          <p className="text-xs text-muted-foreground mt-1">OKRs</p>
        </div>
      </div>

      {/* Time by area top 3 */}
      {metrics.timeByAreaTop3.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Top áreas esta semana</p>
          <div className="space-y-1">
            {metrics.timeByAreaTop3.map((area) => (
              <div key={area.areaName} className="flex justify-between text-sm">
                <span>{area.areaName}</span>
                <span className="text-muted-foreground tabular-nums">
                  {formatSeconds(area.totalSeconds)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Area health trends */}
      {metrics.areaHealthTrends.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Salud de áreas</p>
          <div className="space-y-1">
            {metrics.areaHealthTrends.map((area) => (
              <div key={area.areaName} className="flex justify-between items-center text-sm">
                <span>{area.areaName}</span>
                <span className={`font-bold ${trendColors[area.trend]}`}>
                  {trendIcons[area.trend]} {area.trend}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Phase 2: Analizar ────────────────────────────────────────────────────────

function AnalyzePhase({ data }: { data: WeeklyReviewData }) {
  const { insights, patterns } = data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Fase 2: Analizar</h2>
        <p className="text-sm text-muted-foreground">Insights IA y patrones detectados.</p>
      </div>

      {/* Insights */}
      <div className="rounded-lg border p-4 space-y-2">
        <p className="text-sm font-medium">Insights de la semana</p>
        <p className="text-sm whitespace-pre-wrap leading-relaxed text-muted-foreground">
          {insights}
        </p>
      </div>

      {/* Patterns */}
      {patterns.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Patrones activos</p>
          <div className="divide-y rounded-lg border text-sm overflow-hidden">
            {patterns.slice(0, 5).map((c) => (
              <div key={c.id} className="px-3 py-2 flex justify-between items-center gap-2">
                <span className="capitalize text-xs px-2 py-0.5 rounded-full bg-muted">
                  {c.type.replace('_', ' ')}
                </span>
                <span className="text-muted-foreground tabular-nums text-xs">
                  {c.correlationValue !== null
                    ? `r=${Number(c.correlationValue).toFixed(2)}`
                    : c.tier}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No hay patrones significativos detectados aún (requiere 14+ días de datos).
        </p>
      )}
    </div>
  )
}

// ─── Phase 3: Planificar ──────────────────────────────────────────────────────

function PlanPhase({ data }: { data: WeeklyReviewData }) {
  const { inboxItems, pendingActivities } = data

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Fase 3: Planificar</h2>
        <p className="text-sm text-muted-foreground">Revisa tu inbox y backlog pendiente.</p>
      </div>

      {/* Inbox */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Inbox ({inboxItems.length} {inboxItems.length === 1 ? 'item' : 'items'})
        </p>
        {inboxItems.length === 0 ? (
          <p className="text-sm text-green-600 font-medium">
            ¡Inbox limpio! Nada pendiente de revisar.
          </p>
        ) : (
          <div className="divide-y rounded-lg border text-sm overflow-hidden max-h-48 overflow-y-auto">
            {inboxItems.map((item) => (
              <div key={item.id} className="px-3 py-2">
                <p className="truncate">{item.rawText}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(item.createdAt).toLocaleDateString('es', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pending activities backlog */}
      <div className="space-y-2">
        <p className="text-sm font-medium">
          Backlog pendiente ({pendingActivities.length} actividades)
        </p>
        {pendingActivities.length === 0 ? (
          <p className="text-sm text-green-600 font-medium">Sin actividades pendientes.</p>
        ) : (
          <div className="divide-y rounded-lg border text-sm overflow-hidden max-h-48 overflow-y-auto">
            {pendingActivities.map((act) => (
              <div key={act.id} className="px-3 py-2 flex justify-between items-center gap-2">
                <span className="truncate flex-1">{act.title}</span>
                {act.scheduledDurationMinutes && (
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {act.scheduledDurationMinutes}min
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Phase 4: Confirmar ───────────────────────────────────────────────────────

function ConfirmPhase({ data, onComplete }: { data: WeeklyReviewData; onComplete: () => void }) {
  const { nextWeekActivities } = data
  const totalMinutes = nextWeekActivities.reduce((s, a) => s + (a.scheduledDurationMinutes ?? 0), 0)
  const estimatedHours = Math.round((totalMinutes / 60) * 10) / 10

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-1">Fase 4: Confirmar</h2>
        <p className="text-sm text-muted-foreground">
          Tu semana comprometida para los próximos 7 días.
        </p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">{nextWeekActivities.length}</p>
          <p className="text-xs text-muted-foreground mt-1">actividades planificadas</p>
        </div>
        <div className="rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold">~{estimatedHours}h</p>
          <p className="text-xs text-muted-foreground mt-1">horas estimadas</p>
        </div>
      </div>

      {/* Activities list */}
      {nextWeekActivities.length > 0 && (
        <div className="space-y-1 max-h-48 overflow-y-auto divide-y rounded-lg border overflow-hidden">
          {nextWeekActivities.map((act) => (
            <div key={act.id} className="px-3 py-2 flex justify-between items-center text-sm gap-2">
              <span className="truncate flex-1">{act.title}</span>
              {act.scheduledAt && (
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(act.scheduledAt).toLocaleDateString('es', {
                    weekday: 'short',
                    day: 'numeric',
                  })}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {nextWeekActivities.length === 0 && (
        <p className="text-sm text-muted-foreground">
          No hay actividades programadas para los próximos 7 días. Planifica en el Calendario.
        </p>
      )}

      {/* Complete button */}
      <button
        onClick={onComplete}
        className="w-full py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
      >
        ✓ Completar Weekly Review
      </button>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

const STORAGE_KEY = 'weeklyReviewCompletedAt'

export function WeeklyReviewClient({ data }: { data: WeeklyReviewData }) {
  const [phase, setPhase] = useState(1)
  const [completed, setCompleted] = useState(false)
  const [lastReviewLabel] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null
    const days = Math.floor((Date.now() - new Date(stored).getTime()) / 86400000)
    return days === 0 ? 'hoy' : `hace ${days} día${days === 1 ? '' : 's'}`
  })

  function handleComplete() {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
    setCompleted(true)
  }

  if (completed) {
    return (
      <div className="container max-w-2xl py-16 text-center space-y-4">
        <div className="text-5xl">🎉</div>
        <h1 className="text-2xl font-bold">¡Weekly Review completado!</h1>
        <p className="text-muted-foreground">Tu próxima semana está comprometida. ¡A por ello!</p>
        <a
          href="/reports"
          className="inline-block mt-4 px-6 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
        >
          Ver Informes →
        </a>
      </div>
    )
  }

  return (
    <div className="container max-w-2xl py-8 space-y-6">
      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Weekly Review</h1>
          {lastReviewLabel && (
            <span className="text-xs text-muted-foreground">Último review: {lastReviewLabel}</span>
          )}
        </div>
        <PhaseIndicator current={phase} />
        <p className="text-xs text-muted-foreground">
          Paso {phase} de 4 — {PHASE_LABELS[phase - 1]}
        </p>
      </div>

      {/* Phase content */}
      <div className="rounded-lg border p-6 min-h-[300px]">
        {phase === 1 && <MeasurePhase data={data} />}
        {phase === 2 && <AnalyzePhase data={data} />}
        {phase === 3 && <PlanPhase data={data} />}
        {phase === 4 && <ConfirmPhase data={data} onComplete={handleComplete} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setPhase((p) => Math.max(1, p - 1))}
          disabled={phase === 1}
          className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm hover:bg-muted/80 transition-colors disabled:opacity-30"
        >
          ← Anterior
        </button>
        {phase < 4 && (
          <button
            onClick={() => setPhase((p) => Math.min(4, p + 1))}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            Siguiente →
          </button>
        )}
      </div>
    </div>
  )
}
