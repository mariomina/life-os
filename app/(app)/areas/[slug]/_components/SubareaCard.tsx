'use client'

// app/(app)/areas/[slug]/_components/SubareaCard.tsx
// Tarjeta de sub-área con score, fuentes (hábitos/actividades) y chips de estado.
// Story 11.7 — UI /areas/[slug] Detalle de Área.

import Link from 'next/link'
import { RefreshCw, CalendarDays, Briefcase } from 'lucide-react'
import type { SubareaDetail, AreaSource } from '@/lib/db/queries/areas'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 80) return '#22c55e'
  if (score >= 60) return '#eab308'
  if (score >= 40) return '#f97316'
  return '#ef4444'
}

function daysSince(date: Date | string | null | undefined): number | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  if (isNaN(d.getTime())) return null
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24))
}

function formatRelative(days: number): string {
  if (days === 0) return 'hoy'
  if (days === 1) return 'hace 1 día'
  return `hace ${days} días`
}

// ─── Source Icon + Type Label ──────────────────────────────────────────────────

const SOURCE_CONFIG = {
  habit: { Icon: RefreshCw, colorClass: 'text-blue-500', label: 'Hábito' },
  activity: { Icon: CalendarDays, colorClass: 'text-green-500', label: 'Actividad' },
  project: { Icon: Briefcase, colorClass: 'text-purple-500', label: 'Proyecto' },
} as const

function SourceRow({ source }: { source: AreaSource }) {
  const config = SOURCE_CONFIG[source.type]
  const { Icon, colorClass, label } = config

  let meta = ''
  if (source.type === 'habit') {
    meta =
      source.streak != null && source.streak > 0
        ? `streak ${source.streak} día${source.streak !== 1 ? 's' : ''}`
        : source.lastCompletedAt
          ? `última: ${formatRelative(daysSince(source.lastCompletedAt) ?? 0)}`
          : 'sin completar'
  } else if (source.type === 'activity') {
    const days = daysSince(source.completedAt)
    meta = days != null ? `última: ${formatRelative(days)}` : ''
  } else if (source.type === 'project') {
    meta = `${source.progress ?? 0}% completado`
  }

  return (
    <Link
      href={source.href}
      className="flex items-center justify-between gap-2 text-xs rounded hover:bg-accent/50 px-1 py-0.5 -mx-1 transition-colors group"
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon className={`w-3 h-3 shrink-0 ${colorClass}`} />
        <span className="truncate text-foreground">{source.title}</span>
        <span className="text-muted-foreground shrink-0">{label}</span>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {meta && <span className="text-muted-foreground">{meta}</span>}
        <span className="text-muted-foreground group-hover:text-foreground transition-colors">
          →
        </span>
      </div>
    </Link>
  )
}

// ─── SubareaCard ──────────────────────────────────────────────────────────────

interface SubareaCardProps {
  subarea: SubareaDetail
  /** Days before showing decay alert (default 7) */
  decayThresholdDays?: number
}

export function SubareaCard({ subarea, decayThresholdDays = 7 }: SubareaCardProps) {
  const score = subarea.currentScore
  const color = scoreColor(score)
  const weight = Math.round(parseFloat(String(subarea.internalWeight)) * 100)

  // Compute days since last activity from sources
  const allDates: (Date | string | null | undefined)[] = [
    ...subarea.sources.filter((s) => s.type === 'habit').map((s) => s.lastCompletedAt),
    ...subarea.sources.filter((s) => s.type === 'activity').map((s) => s.completedAt),
  ]
  const validDays = allDates.map((d) => daysSince(d)).filter((d): d is number => d !== null)
  const minDays = validDays.length > 0 ? Math.min(...validDays) : null
  const hasDecay = minDays !== null && minDays >= decayThresholdDays

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-foreground truncate">{subarea.name}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-sm font-bold" style={{ color }}>
              {score}%
            </span>
            <span className="text-xs text-muted-foreground">· peso {weight}%</span>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${score}%`, backgroundColor: color }}
          />
        </div>
      </div>

      {/* Status chips */}
      <div className="flex flex-wrap gap-1.5">
        {subarea.isOptional && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            Opcional
          </span>
        )}
        {hasDecay && minDays !== null && (
          <span className="rounded-full bg-orange-100 dark:bg-orange-950/30 px-2 py-0.5 text-[10px] text-orange-600 dark:text-orange-400">
            ⚠ Sin actividad {minDays} día{minDays !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Sources */}
      <div className="space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1.5">
          Cubierto por
        </p>
        {subarea.sources.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Ninguna actividad cubre esta sub-área
          </p>
        ) : (
          subarea.sources.slice(0, 5).map((source) => <SourceRow key={source.id} source={source} />)
        )}
        {subarea.sources.length > 5 && (
          <p className="text-[10px] text-muted-foreground mt-1">
            +{subarea.sources.length - 5} más
          </p>
        )}
      </div>
    </div>
  )
}
