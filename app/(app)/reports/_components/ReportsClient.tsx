'use client'

// app/(app)/reports/_components/ReportsClient.tsx
// Story 8.1 — Time by Area + Time by Project con selector de período.

import { useState, useTransition } from 'react'
import {
  getTimeByArea,
  getTimeByProject,
  type TimeByAreaRow,
  type TimeByProjectRow,
} from '@/actions/reports'
import type { ReportPeriod } from '@/features/reports/periods'

// ─── Format helpers ───────────────────────────────────────────────────────────

function formatSeconds(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}min`
  if (m === 0) return `${h}h`
  return `${h}h ${m}min`
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

// ─── Main Component ───────────────────────────────────────────────────────────

interface ReportsClientProps {
  initialTimeByArea: TimeByAreaRow[]
  initialTimeByProject: TimeByProjectRow[]
  initialPeriod: ReportPeriod
}

export function ReportsClient({
  initialTimeByArea,
  initialTimeByProject,
  initialPeriod,
}: ReportsClientProps) {
  const [period, setPeriod] = useState<ReportPeriod>(initialPeriod)
  const [timeByArea, setTimeByArea] = useState(initialTimeByArea)
  const [timeByProject, setTimeByProject] = useState(initialTimeByProject)
  const [isPending, startTransition] = useTransition()

  function handlePeriodChange(newPeriod: ReportPeriod) {
    setPeriod(newPeriod)
    startTransition(async () => {
      const [area, project] = await Promise.all([
        getTimeByArea(newPeriod),
        getTimeByProject(newPeriod),
      ])
      setTimeByArea(area)
      setTimeByProject(project)
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

      {/* Time by Area */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tiempo por Área</h2>
        {isPending ? (
          <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
        ) : (
          <TimeTable rows={areaRows} />
        )}
      </section>

      {/* Time by Project */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Tiempo por Proyecto</h2>
        {isPending ? (
          <p className="text-sm text-muted-foreground animate-pulse">Cargando...</p>
        ) : (
          <TimeTable rows={projectRows} />
        )}
      </section>
    </div>
  )
}
