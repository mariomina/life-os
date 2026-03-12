'use client'

// app/(app)/areas/_components/AreaCard.tsx
// Tarjeta de área Maslow con score circular SVG + top 3 sub-áreas.
// Story 11.6 — UI /areas GLSHS Chart + Grid de Cards con Score Circular.

import { useEffect, useRef, useState } from 'react'
import { RefreshCw, ClipboardList, CalendarDays } from 'lucide-react'
import type { AreaWithSubareas } from '@/lib/db/queries/areas'

// ─── Score Circular ───────────────────────────────────────────────────────────

interface CircularScoreProps {
  score: number
  color: string
}

function CircularScore({ score, color }: CircularScoreProps) {
  const [displayed, setDisplayed] = useState(0)
  const animRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null)

  useEffect(() => {
    const duration = 700
    const start = performance.now()

    function step(now: number) {
      const elapsed = now - start
      const progress = Math.min(elapsed / duration, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplayed(Math.round(eased * score))
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step)
      }
    }

    animRef.current = requestAnimationFrame(step)
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current)
    }
  }, [score])

  // SVG path: circle r=15.9, circumference ≈ 99.9
  const radius = 15.9
  const circumference = 2 * Math.PI * radius // ≈ 99.9
  const strokeDash = (displayed / 100) * circumference
  const strokeGap = circumference - strokeDash

  return (
    <div className="relative flex items-center justify-center w-16 h-16 shrink-0">
      <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
        {/* Track */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className="text-muted/30"
        />
        {/* Progress */}
        <circle
          cx="18"
          cy="18"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray={`${strokeDash.toFixed(2)} ${strokeGap.toFixed(2)}`}
        />
      </svg>
      <span className="absolute text-xs font-bold text-foreground">{displayed}</span>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e' // green-500
  if (score >= 60) return '#eab308' // yellow-500
  if (score >= 40) return '#f97316' // orange-500
  return '#ef4444' // red-500
}

function borderClass(score: number): string {
  if (score >= 80) return 'border-green-500/30'
  if (score >= 60) return 'border-yellow-500/30'
  if (score >= 40) return 'border-orange-500/30'
  return 'border-red-500 animate-pulse'
}

function trendArrow(delta: number): { arrow: string; colorClass: string } {
  if (delta > 2) return { arrow: '↗', colorClass: 'text-green-500' }
  if (delta < -2) return { arrow: '↘', colorClass: 'text-red-500' }
  return { arrow: '→', colorClass: 'text-muted-foreground' }
}

const AREA_ICONS: Record<number, string> = {
  1: '🧬',
  2: '🏠',
  3: '👥',
  4: '🏆',
  5: '📚',
  6: '🎨',
  7: '🌟',
  8: '🌍',
}

// ─── AreaCard ─────────────────────────────────────────────────────────────────

interface AreaCardProps {
  area: AreaWithSubareas
  /** Score 7 days ago — to compute trend delta */
  previousScore?: number
  /** True when last activity is > decay threshold days ago */
  hasDecayAlert?: boolean
}

export function AreaCard({ area, previousScore, hasDecayAlert = false }: AreaCardProps) {
  const score = area.currentScore
  const delta = previousScore !== undefined ? score - previousScore : 0
  const { arrow, colorClass } = trendArrow(delta)
  const color = scoreColor(score)
  const border = borderClass(score)
  const icon = AREA_ICONS[area.maslowLevel] ?? '⭕'
  const isVeryLow = score < 40

  return (
    <div
      className={`relative rounded-2xl border-2 bg-card p-4 space-y-3 shadow-[0_1px_3px_rgb(0_0_0/0.06)] transition-colors ${border}`}
    >
      {/* Badge ⚠ Atención */}
      {isVeryLow && (
        <span className="absolute top-2 right-2 rounded-full bg-red-100 dark:bg-red-950 px-2 py-0.5 text-[10px] font-medium text-red-600 dark:text-red-400">
          ⚠ Atención
        </span>
      )}

      {/* Header: icon + nombre + score circular + tendencia */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{icon}</span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{area.name}</p>
            <p className="text-xs text-muted-foreground">Nivel {area.maslowLevel}</p>
          </div>
        </div>

        <div className="flex flex-col items-center shrink-0">
          <CircularScore score={score} color={color} />
          <span className={`text-xs font-medium mt-0.5 ${colorClass}`}>{arrow}</span>
        </div>
      </div>

      {/* Top 3 sub-áreas */}
      {area.topSubareas.length > 0 && (
        <div className="space-y-1.5">
          {area.topSubareas.map((sub) => (
            <div key={sub.id} className="space-y-0.5">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 min-w-0">
                  <SourceIcon slug={sub.slug} />
                  <span className="text-muted-foreground truncate">{sub.name}</span>
                </div>
                <span className="font-medium text-foreground shrink-0 ml-1">
                  {sub.currentScore}%
                </span>
              </div>
              <div className="h-1 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${sub.currentScore}%`, backgroundColor: color }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decay alert */}
      {hasDecayAlert && (
        <p className="text-[10px] text-orange-600 dark:text-orange-400">
          ⚠ Sin actividad reciente — score en decaimiento
        </p>
      )}

      {/* Footer */}
      <p className="text-[10px] text-muted-foreground">
        {area.subareaCount} sub-área{area.subareaCount !== 1 ? 's' : ''}
        {area.topSubareas.length > 0 && ` · ${area.topSubareas.length} mostradas`}
      </p>
    </div>
  )
}

// ─── SourceIcon ───────────────────────────────────────────────────────────────

const HABIT_SLUGS = ['sueno', 'ejercicio', 'alimentacion', 'gratitud', 'meditacion', 'servicio']
const PROJECT_SLUGS = ['proposito', 'autonomia', 'crecimiento_personal', 'trabajo_significativo']

function SourceIcon({ slug }: { slug: string }) {
  if (HABIT_SLUGS.includes(slug))
    return <RefreshCw className="w-3 h-3 text-muted-foreground shrink-0" />
  if (PROJECT_SLUGS.includes(slug))
    return <ClipboardList className="w-3 h-3 text-muted-foreground shrink-0" />
  return <CalendarDays className="w-3 h-3 text-muted-foreground shrink-0" />
}
