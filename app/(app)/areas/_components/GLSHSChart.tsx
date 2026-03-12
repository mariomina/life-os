'use client'

// app/(app)/areas/_components/GLSHSChart.tsx
// Chart hero del GLSHS histórico usando SVG nativo.
// Story 11.6 — UI /areas GLSHS Chart + Grid de Cards.

import { useState, useMemo } from 'react'
import type { GLSHSPoint } from '@/lib/db/queries/areas'

type Period = '7D' | '30D' | 'Q1' | 'Q2' | 'Q3' | 'Q4' | 'Year'

const PERIODS: Period[] = ['7D', '30D', 'Q1', 'Q2', 'Q3', 'Q4', 'Year']

function filterByPeriod(data: GLSHSPoint[], period: Period): GLSHSPoint[] {
  const now = new Date()
  const year = now.getUTCFullYear()

  let cutoff: Date

  if (period === '7D') {
    cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 7)
  } else if (period === '30D') {
    cutoff = new Date(now)
    cutoff.setDate(cutoff.getDate() - 30)
  } else if (period === 'Q1') {
    cutoff = new Date(`${year}-01-01`)
    return data.filter((d) => d.date >= `${year}-01-01` && d.date <= `${year}-03-31`)
  } else if (period === 'Q2') {
    cutoff = new Date(`${year}-04-01`)
    return data.filter((d) => d.date >= `${year}-04-01` && d.date <= `${year}-06-30`)
  } else if (period === 'Q3') {
    return data.filter((d) => d.date >= `${year}-07-01` && d.date <= `${year}-09-30`)
  } else if (period === 'Q4') {
    return data.filter((d) => d.date >= `${year}-10-01` && d.date <= `${year}-12-31`)
  } else {
    // Year
    return data.filter((d) => d.date.startsWith(`${year}`))
  }

  const cutoffStr = cutoff.toISOString().slice(0, 10)
  return data.filter((d) => d.date >= cutoffStr)
}

function buildSvgPath(points: GLSHSPoint[], width: number, height: number): string {
  if (points.length < 2) return ''

  const padding = { top: 8, bottom: 8 }
  const chartH = height - padding.top - padding.bottom
  const minScore = Math.min(...points.map((p) => p.score))
  const maxScore = Math.max(...points.map((p) => p.score))
  const range = maxScore - minScore || 1

  const toX = (i: number) => (i / (points.length - 1)) * width
  const toY = (s: number) => padding.top + chartH - ((s - minScore) / range) * chartH

  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(i).toFixed(1)},${toY(p.score).toFixed(1)}`)
    .join(' ')

  return d
}

function buildAreaPath(points: GLSHSPoint[], width: number, height: number): string {
  if (points.length < 2) return ''
  const linePath = buildSvgPath(points, width, height)
  const lastX = width.toFixed(1)
  return `${linePath} L${lastX},${height} L0,${height} Z`
}

interface TooltipData {
  x: number
  y: number
  date: string
  score: number
}

interface GLSHSChartProps {
  data: GLSHSPoint[]
  /** Precomputed height in px */
  height?: number
}

export function GLSHSChart({ data, height = 180 }: GLSHSChartProps) {
  const [period, setPeriod] = useState<Period>('30D')
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const filtered = useMemo(() => filterByPeriod(data, period), [data, period])

  const currentScore = filtered.at(-1)?.score ?? 0
  const previousScore = filtered.at(0)?.score ?? currentScore
  const delta = currentScore - previousScore
  const deltaStr = delta >= 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)
  const deltaColor =
    delta > 0 ? 'text-green-500' : delta < 0 ? 'text-red-500' : 'text-muted-foreground'
  const deltaArrow = delta > 0 ? '↗' : delta < 0 ? '↘' : '→'

  const isLow = currentScore < 50

  const svgWidth = 600
  const svgHeight = height - 48 // subtract header area

  const linePath = buildSvgPath(filtered, svgWidth, svgHeight)
  const areaPath = buildAreaPath(filtered, svgWidth, svgHeight)

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    if (filtered.length < 2) return
    const rect = e.currentTarget.getBoundingClientRect()
    const relX = ((e.clientX - rect.left) / rect.width) * svgWidth
    const idx = Math.round((relX / svgWidth) * (filtered.length - 1))
    const clamped = Math.max(0, Math.min(filtered.length - 1, idx))
    const point = filtered[clamped]
    if (!point) return
    const xPct = (clamped / (filtered.length - 1)) * 100
    setTooltip({ x: xPct, y: 50, date: point.date, score: point.score })
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Life System Health Score
          </p>
          <div className="flex items-baseline gap-2 mt-0.5">
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

      {/* Alert si GLSHS < 50 */}
      {isLow && (
        <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">
          ⚠ Tu GLSHS está por debajo de 50 — algunas áreas necesitan atención urgente.
        </p>
      )}

      {/* SVG Chart */}
      {filtered.length < 2 ? (
        <div
          className="flex items-center justify-center text-xs text-muted-foreground"
          style={{ height: svgHeight }}
        >
          Sin datos suficientes para este período
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
              <linearGradient id="glshs-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={isLow ? '#ef4444' : '#6366f1'} stopOpacity="0.3" />
                <stop offset="100%" stopColor={isLow ? '#ef4444' : '#6366f1'} stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Area fill */}
            <path d={areaPath} fill="url(#glshs-gradient)" />

            {/* Line */}
            <path
              d={linePath}
              fill="none"
              stroke={isLow ? '#ef4444' : '#6366f1'}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={isLow ? 'animate-pulse' : ''}
            />

            {/* Tooltip dot */}
            {tooltip && (
              <circle
                cx={(tooltip.x / 100) * svgWidth}
                cy={svgHeight * 0.5}
                r="4"
                fill={isLow ? '#ef4444' : '#6366f1'}
              />
            )}
          </svg>

          {/* Tooltip overlay */}
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
