'use client'

// app/(app)/reports/_components/ReportsClient.tsx
// Story 8.1 — Time by Area + Time by Project con selector de período.
// Story 8.2 — Habit Consistency + CCR + OKR Progress + Area Health Trend.
// Story 8.6 — Insights IA (ILLMProvider).

import { useState, useTransition } from 'react'
import {
  getTimeByArea,
  getTimeByProject,
  getHabitConsistencyReport,
  getCalendarCommitmentRate,
  generateReportInsights,
  type TimeByAreaRow,
  type TimeByProjectRow,
  type OkrProgressItem,
  type AreaHealthTrendRow,
  type InsightsResult,
} from '@/actions/reports'
import type { ReportPeriod } from '@/features/reports/periods'
import type { HabitConsistencyItem, CCRResult } from '@/features/reports/metrics'

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
}

function formatRate(rate: number): string {
  return `${Math.round(rate * 100)}%`
}

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - new Date(date).getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'ahora mismo'
  if (diffMin < 60) return `hace ${diffMin} min`
  const diffH = Math.floor(diffMin / 60)
  return `hace ${diffH}h`
}

// ─── Period Selector ──────────────────────────────────────────────────────────

interface PeriodSelectorProps {
  value: ReportPeriod
  onChange: (p: ReportPeriod) => void
  disabled?: boolean
}

function PeriodSelector({ value, onChange, disabled }: PeriodSelectorProps) {
  const options: { label: string; value: ReportPeriod }[] = [
    { label: 'Semana', value: 'week' },
    { label: 'Mes', value: 'month' },
    { label: 'Trimestre', value: 'quarter' },
  ]
  return (
    <div className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            value === opt.value
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          } disabled:opacity-50`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

// ─── Time Table ───────────────────────────────────────────────────────────────

interface TimeTableProps {
  rows: { id: string; name: string; totalSeconds: number }[]
  emptyMessage?: string
}

function TimeTable({
  rows,
  emptyMessage = 'No hay registros de tiempo en este período.',
}: TimeTableProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">{emptyMessage}</p>
  }

  const maxSeconds = Math.max(...rows.map((r) => r.totalSeconds), 1)

  return (
    <div className="space-y-3">
      {rows.map((row) => {
        const percent = Math.round((row.totalSeconds / maxSeconds) * 100)
        return (
          <div key={row.id} className="space-y-1">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium truncate max-w-[60%]">{row.name}</span>
              <span className="text-muted-foreground tabular-nums">
                {formatSeconds(row.totalSeconds)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-primary transition-all duration-300"
                style={{ width: `${percent}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── Habit Consistency Section ────────────────────────────────────────────────

function HabitConsistencySection({ items }: { items: HabitConsistencyItem[] }) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No hay hábitos registrados en este período.
      </p>
    )
  }
  const avgRate = items.reduce((s, h) => s + h.rate, 0) / items.length
  return (
    <div className="space-y-3">
      <p className="text-3xl font-bold">{formatRate(avgRate)}</p>
      <p className="text-xs text-muted-foreground">consistencia promedio de hábitos</p>
      <div className="space-y-2 mt-3">
        {items.map((h) => (
          <div key={h.habitId} className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="truncate max-w-[60%]">{h.habitName}</span>
              <span className="text-muted-foreground tabular-nums">
                {h.completed}/{h.planned} · {formatRate(h.rate)}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-green-500 transition-all"
                style={{ width: `${Math.round(h.rate * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── CCR Section ─────────────────────────────────────────────────────────────

function CCRSection({ ccr }: { ccr: CCRResult }) {
  if (ccr.planned === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        Sin actividades planificadas en este período.
      </p>
    )
  }
  return (
    <div className="space-y-2">
      <p className="text-3xl font-bold">{ccr.rate != null ? formatRate(ccr.rate) : '—'}</p>
      <p className="text-xs text-muted-foreground">
        {ccr.completed} de {ccr.planned} actividades planificadas completadas
      </p>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full bg-primary transition-all"
          style={{ width: `${ccr.rate != null ? Math.round(ccr.rate * 100) : 0}%` }}
        />
      </div>
    </div>
  )
}

// ─── OKR Progress Section ─────────────────────────────────────────────────────

function OkrProgressSection({ items }: { items: OkrProgressItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No hay OKRs activos.</p>
  }
  return (
    <div className="space-y-4">
      {items.map((okr) => (
        <div key={okr.okrId} className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium truncate max-w-[70%]">{okr.objective}</span>
            <span className="text-muted-foreground tabular-nums">{okr.avgProgress}%</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all"
              style={{ width: `${okr.avgProgress}%` }}
            />
          </div>
          {okr.krs.length > 0 && (
            <div className="ml-3 space-y-1">
              {okr.krs.map((kr) => (
                <div key={kr.krId} className="flex justify-between text-xs text-muted-foreground">
                  <span className="truncate max-w-[70%]">{kr.title}</span>
                  <span>{kr.progress}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Area Health Trend Section ────────────────────────────────────────────────

const trendIcons: Record<string, string> = { improving: '↑', declining: '↓', stable: '→' }
const trendColors: Record<string, string> = {
  improving: 'text-green-600',
  declining: 'text-red-500',
  stable: 'text-muted-foreground',
}

function AreaHealthSection({ items }: { items: AreaHealthTrendRow[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted-foreground py-2">No hay datos de salud de áreas aún.</p>
  }
  return (
    <div className="space-y-2">
      {items.map((area) => (
        <div key={area.areaId} className="flex items-center justify-between text-sm">
          <span className="truncate max-w-[60%]">{area.areaName}</span>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground tabular-nums">{area.currentScore}</span>
            <span className={`font-bold ${trendColors[area.trend]}`}>{trendIcons[area.trend]}</span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Insights IA Section (Story 8.6) ─────────────────────────────────────────

interface InsightsSectionProps {
  initialInsights: InsightsResult | null
  period: ReportPeriod
}

function InsightsSection({ initialInsights, period }: InsightsSectionProps) {
  const [insights, setInsights] = useState<InsightsResult | null>(initialInsights)
  const [isGenerating, startGenerating] = useTransition()

  function handleRegenerate() {
    startGenerating(async () => {
      const result = await generateReportInsights(period)
      setInsights(result)
    })
  }

  // Show info banner when using mock provider (env var is public, available client-side)
  const usingMock = (process.env.NEXT_PUBLIC_LLM_PROVIDER ?? 'mock') === 'mock'

  return (
    <section className="rounded-lg border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Insights IA</h2>
        <button
          onClick={handleRegenerate}
          disabled={isGenerating}
          className="text-xs px-3 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors disabled:opacity-50"
        >
          {isGenerating ? 'Generando...' : 'Regenerar'}
        </button>
      </div>

      {usingMock && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
          Configura <code>ANTHROPIC_API_KEY</code> y <code>NEXT_PUBLIC_LLM_PROVIDER=claude</code>{' '}
          para activar insights con IA real.
        </div>
      )}

      {isGenerating ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-full" />
          <div className="h-3 bg-muted rounded w-5/6" />
        </div>
      ) : insights ? (
        <div className="space-y-2">
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{insights.insights}</p>
          <p className="text-xs text-muted-foreground">
            Generado {formatRelativeTime(insights.generatedAt)} · {insights.provider}
          </p>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Haz clic en &quot;Regenerar&quot; para generar insights de tus datos.
        </p>
      )}
    </section>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ReportsClientProps {
  initialTimeByArea: TimeByAreaRow[]
  initialTimeByProject: TimeByProjectRow[]
  initialHabitConsistency: HabitConsistencyItem[]
  initialCCR: CCRResult
  initialOkrProgress: OkrProgressItem[]
  initialAreaHealthTrends: AreaHealthTrendRow[]
  initialInsights: InsightsResult | null
  initialPeriod: ReportPeriod
}

export function ReportsClient({
  initialTimeByArea,
  initialTimeByProject,
  initialHabitConsistency,
  initialCCR,
  initialOkrProgress,
  initialAreaHealthTrends,
  initialInsights,
  initialPeriod,
}: ReportsClientProps) {
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod)
  const [timeByArea, setTimeByArea] = useState(initialTimeByArea)
  const [timeByProject, setTimeByProject] = useState(initialTimeByProject)
  const [habitConsistency, setHabitConsistency] = useState(initialHabitConsistency)
  const [ccr, setCcr] = useState(initialCCR)
  const [okrProgress] = useState(initialOkrProgress)
  const [areaHealthTrends] = useState(initialAreaHealthTrends)
  const [isPending, startTransition] = useTransition()

  function handlePeriodChange(newPeriod: ReportPeriod) {
    setPeriod(newPeriod)
    startTransition(async () => {
      const [area, project, habits, newCcr] = await Promise.all([
        getTimeByArea(newPeriod),
        getTimeByProject(newPeriod),
        getHabitConsistencyReport(newPeriod),
        getCalendarCommitmentRate(newPeriod),
      ])
      setTimeByArea(area)
      setTimeByProject(project)
      setHabitConsistency(habits)
      setCcr(newCcr)
    })
  }

  const areaRows = timeByArea.map((r) => ({
    id: r.areaId,
    name: r.areaName,
    totalSeconds: r.totalSeconds,
  }))
  const projectRows = timeByProject.map((r) => ({
    id: r.projectId,
    name: r.projectName,
    totalSeconds: r.totalSeconds,
  }))

  return (
    <div className="container max-w-3xl py-8 space-y-8">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold">Informes</h1>
        <p className="text-muted-foreground text-sm">Análisis de tu tiempo, hábitos y progreso.</p>
      </div>

      {/* Period Selector */}
      <PeriodSelector value={period} onChange={handlePeriodChange} disabled={isPending} />

      {/* Loading overlay */}
      {isPending && <p className="text-sm text-muted-foreground animate-pulse">Actualizando...</p>}

      {/* ── Insights IA (Story 8.6) ── */}
      <InsightsSection initialInsights={initialInsights} period={period} />

      {/* ── Métricas (Story 8.2) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="text-base font-semibold">Consistencia de Hábitos</h2>
          <HabitConsistencySection items={habitConsistency} />
        </section>

        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="text-base font-semibold">Tasa de Compromiso (CCR)</h2>
          <CCRSection ccr={ccr} />
        </section>

        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="text-base font-semibold">Progreso OKRs</h2>
          <OkrProgressSection items={okrProgress} />
        </section>

        <section className="rounded-lg border p-4 space-y-2">
          <h2 className="text-base font-semibold">Salud de Áreas</h2>
          <AreaHealthSection items={areaHealthTrends} />
        </section>
      </div>

      {/* ── Time by Area (Story 8.1) ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tiempo por Área</h2>
        {!isPending && <TimeTable rows={areaRows} />}
      </section>

      {/* ── Time by Project (Story 8.1) ── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tiempo por Proyecto</h2>
        {!isPending && <TimeTable rows={projectRows} />}
      </section>
    </div>
  )
}
