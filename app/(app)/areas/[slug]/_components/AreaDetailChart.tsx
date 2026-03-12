'use client'

// app/(app)/areas/[slug]/_components/AreaDetailChart.tsx
// Chart del histórico de score de un área específica.
// Story 11.7 — UI /areas/[slug] Detalle de Área.
// Misma mecánica que GLSHSChart pero con header del área.

import { useState, useMemo } from 'react'
import type { GLSHSPoint } from '@/lib/db/queries/areas'
import { MASLOW_WEIGHTS, type MaslowLevel } from '@/lib/utils/maslow-weights'

type Period = '7D' | '30D' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Year'
const PERIODS: Period[] = ['7D', '30D', 'Q1', 'Q2', 'Q3', 'Q4', 'Year']

function filterByPeriod(data: GLSHSPoint[], period: Period): GLSHSPoint[] {
  const now = new Date()
  const year = now.getUTCFullYear()

  if (period === '7D') {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 7)
    return data.filter((d) => d.date >= cutoff.toISOString().slice(0, 10))
  }
  if (period === '30D') {
    const cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 30)
    return data.filter((d) => d.date >= cutoff.toISOString().slice(0, 10))
  }
  if (period === 'Q1')
    return data.filter((d) => d.date >= `${year}-01-01` && d.date <= `${year}-03-31`)
  if (period === 'Q2')
    return data.filter((d) => d.date >= `${year}-04-01` && d.date <= `${year}-06-30`)
  if (period === 'Q3')
    return data.filter((d) => d.date >= `${year}-07-01` && d.date <= `${year}-09-30`)
  if (period === 'Q4')
    return data.filter((d) => d.date >= `${year}-10-01` && d.date <= `${year}-12-31`)
  return data.filter((d) => d.date.startsWith(`${year}`))
}

function buildLinePath(points: GLSHSPoint[], w: number, h: number): string {
  if (points.length < 2) return ''
  const pad = { top: 8, bottom: 8 }
  const chartH = h - pad.top - pad.bottom
  const min = Math.min(...points.map((p) => p.score))
  const max = Math.max(...points.map((p) => p.score))
  const range = max - min || 1
  const toX = (i: number) => (i / (points.length - 1)) * w
  const toY = (s: number) => pad.top + chartH - ((s - min) / range) * chartH
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.score).toFixed(1)}`)
    .join(' ')
}

function buildAreaPath(points: GLSHSPoint[], w: number, h: number): string {
  if (points.length < 2) return ''
  return `${buildLinePath(points, w, h)} L${w.toFixed(1)},${h} L0,${h} Z`
}

interface TooltipData {
  x: number
  date: string
  score: number
}

interface AreaDetailChartProps {
  data: GLSHSPoint[]
  area: {
    name: string
    maslowLevel: number
    weightMultiplier: string | number
    currentScore: number
  }
  height?: number
}

export function AreaDetailChart({ data, area, height = 180 }: AreaDetailChartProps) {
  const [period, setPeriod] = useState<Period>('30D')
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const filtered = useMemo(() => filterByPeriod(data, period), [data, period])

  const currentScore = filtered.at(-1)?.score ?? area.currentScore
  const previousScore = filtered.at(0)?.score ?? currentScore
  const delta = currentScore - previousScore
  const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)
  const deltaColor =
    delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'
  const deltaArrow = delta > 0 ? '↗' : delta < 0 ? '↘' : '→'
  const isLow = currentScore < 50

  const weight = MASLOW_WEIGHTS[area.maslowLevel as MaslowLevel]
  const svgWidth = 600
  const svgHeight = height - 52

  const linePath = buildLinePath(filtered, svgWidth, svgHeight)
  const areaPath = buildAreaPath(filtered, svgWidth, svgHeight)
  const strokeColor = isLow ? '#ef4444' : '#6366f1'

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (filtered.length < 2) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * svgWidth
    const idx = Math.round((relX / svgWidth) * (filtered.length - 1))
    const clamped = Math.max(0, Math.min(filtered.length - 1, idx))
    const point = filtered[clamped]
    if (!point) return
    setTooltip({ x: (clamped / (filtered.length - 1)) * 100, date: point.date, score: point.score })
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Nivel {area.maslowLevel} · ×{weight.toFixed(1)}
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-lg font-semibold text-foreground">{area.name}</span>
          </div>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-3xl font-bold ${isLow ? 'text-red-500' : 'text-foreground'}`}>
              {currentScore.toFixed(1)}
            </span>
            <span className={`text-sm font-medium ${deltaColor}`}>
              {deltaArrow} {deltaStr}
            </span>
          </div>
        </div>

        {/* Period selector */}
        <div className="flex gap-1 flex-wrap justify-end">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded px-2 py-0.5 text-xs transition-colors ${
                period === p
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* SVG Chart */}
      {filtered.length < 2 ? (
        <div
          className="flex items-center justify-center text-xs text-muted-foreground"
          style={{ height: svgHeight }}
        >
          Sin datos para este período
        </div>
      ) : (
        <div className="relative" style={{ height: svgHeight }}>
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full overflow-visible"
            onMouseMove={handleMouseMove}
            onMouseLeave={() => setTooltip(null)}
          >
            <defs>
              <linearGradient id="area-detail-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d={areaPath} fill="url(#area-detail-gradient)" />
            <path
              d={linePath}
              fill="none"
              stroke={strokeColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isLow ? 'animate-pulse' : ''}
            />
            {tooltip && (
              <circle
                cx={(tooltip.x / 100) * svgWidth}
                cy={svgHeight * 0.5}
                r="4"
                fill={strokeColor}
              />
            )}
          </svg>
          {tooltip && (
            <div
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg border bg-popover px-2 py-1 text-xs shadow-md"
              style={{ left: `${tooltip.x}%`, top: '30%' }}
            >
              <p className="text-muted-foreground">{tooltip.date}</p>
              <p className="font-semibold">{tooltip.score}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
