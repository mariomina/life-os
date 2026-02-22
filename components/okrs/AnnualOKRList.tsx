'use client'

// components/okrs/AnnualOKRList.tsx
// Lista de OKRs anuales con OKRImpactBadge y formulario de creación.
// Aplica la regla Buffett 5/25: deshabilita "Nuevo OKR" si ya hay MAX_ANNUAL_OKRS activos.

import { useState, useTransition } from 'react'
import { OKRForm } from '@/components/okrs/OKRForm'
import { OKRImpactBadge } from '@/components/okrs/OKRImpactBadge'
import { createAnnualOKR } from '@/actions/okrs'
import { calculateOKRImpact, buildScoreMap } from '@/features/maslow/okr-impact'
import { MAX_ANNUAL_OKRS } from '@/lib/utils/okr-constants'
import type { OKR } from '@/lib/db/schema/okrs'
import type { Area } from '@/lib/db/schema/areas'
import type { AreaScore } from '@/lib/db/schema/area-scores'

interface AnnualOKRListProps {
  /** OKRs anuales del año actual cargados en servidor. */
  annualOKRs: OKR[]
  /** Áreas del usuario — para OKRForm (hierarchy guard + impact). */
  areas: Area[]
  /** Historial reciente de scores — para OKRForm (hierarchy guard). */
  scoreHistory: AreaScore[]
  /** Año actual. */
  year: number
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
  paused: 'Pausado',
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  completed: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  cancelled: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400',
  paused: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
}

/**
 * Lista de OKRs anuales con soporte para crear nuevos.
 * La regla Buffett se controla en dos capas:
 *   1. UI: botón deshabilitado cuando activeCount >= MAX_ANNUAL_OKRS
 *   2. Server Action: retorna error si la validación falla igualmente
 */
export function AnnualOKRList({ annualOKRs, areas, scoreHistory, year }: AnnualOKRListProps) {
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeCount = annualOKRs.filter((o) => o.status === 'active').length
  const isBuffettLimitReached = activeCount >= MAX_ANNUAL_OKRS

  const scoreMap = buildScoreMap(areas)

  function handleOKRSubmit(data: { title: string; areaId: string; year: number }) {
    setFormError(null)
    startTransition(async () => {
      const result = await createAnnualOKR({
        title: data.title,
        areaId: data.areaId || null,
        year: data.year,
      })

      if (result.error) {
        setFormError(result.error)
      } else {
        setShowForm(false)
      }
    })
  }

  // Estado vacío
  if (annualOKRs.length === 0 && !showForm) {
    return (
      <div className="space-y-4">
        <SectionHeader
          year={year}
          activeCount={activeCount}
          isBuffettLimitReached={isBuffettLimitReached}
          onNew={() => setShowForm(true)}
        />
        <div className="rounded-xl border bg-card p-6 space-y-3 text-center">
          <span className="text-4xl">🎯</span>
          <div className="space-y-1">
            <h4 className="text-sm font-semibold text-foreground">Sin OKRs anuales para {year}</h4>
            <p className="text-xs text-muted-foreground">
              Define hasta {MAX_ANNUAL_OKRS} objetivos anuales anclados a tu visión.
            </p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Crear primer OKR
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <SectionHeader
        year={year}
        activeCount={activeCount}
        isBuffettLimitReached={isBuffettLimitReached}
        onNew={() => {
          setShowForm(true)
          setFormError(null)
        }}
      />

      {/* Lista de OKRs */}
      <div className="space-y-3">
        {annualOKRs.map((okr) => {
          const impactResult = okr.areaId
            ? calculateOKRImpact({ areaId: okr.areaId }, areas, scoreMap)
            : null
          const linkedArea = areas.find((a) => a.id === okr.areaId)

          return (
            <div key={okr.id} className="rounded-lg border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{okr.title}</p>
                  {linkedArea && (
                    <p className="text-xs text-muted-foreground">
                      {linkedArea.name} · Nivel {linkedArea.maslowLevel}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {impactResult && impactResult.deltaPoints > 0 && (
                    <OKRImpactBadge result={impactResult} />
                  )}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[okr.status] ?? ''}`}
                  >
                    {STATUS_LABELS[okr.status] ?? okr.status}
                  </span>
                </div>
              </div>

              {/* Barra de progreso */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progreso</span>
                  <span>{okr.progress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-blue-500 transition-all"
                    style={{ width: `${okr.progress}%` }}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Formulario de nuevo OKR */}
      {showForm && (
        <div className="rounded-xl border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-foreground">Nuevo OKR anual</h4>
            <button
              onClick={() => {
                setShowForm(false)
                setFormError(null)
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancelar
            </button>
          </div>

          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 rounded-md bg-red-50 dark:bg-red-900/20 px-3 py-2">
              {formError}
            </p>
          )}

          <OKRForm areas={areas} scoreHistory={scoreHistory} onSubmit={handleOKRSubmit} />

          {isPending && <p className="text-xs text-muted-foreground text-center">Creando OKR...</p>}
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente de cabecera ───────────────────────────────────────────────

interface SectionHeaderProps {
  year: number
  activeCount: number
  isBuffettLimitReached: boolean
  onNew: () => void
}

function SectionHeader({ year, activeCount, isBuffettLimitReached, onNew }: SectionHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold text-foreground">OKRs Anuales {year}</h3>
        <p className="text-xs text-muted-foreground">
          {activeCount} / {MAX_ANNUAL_OKRS} activos
        </p>
      </div>
      <div className="relative group">
        <button
          onClick={onNew}
          disabled={isBuffettLimitReached}
          className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600 transition-colors"
        >
          + Nuevo OKR
        </button>
        {isBuffettLimitReached && (
          <div className="absolute right-0 top-full mt-1 z-10 hidden group-hover:block w-64 rounded-md bg-gray-900 px-3 py-2 text-xs text-white shadow-lg">
            Máx. {MAX_ANNUAL_OKRS} OKRs anuales activos — Buffett 5/25. Cancela uno antes de crear
            otro.
          </div>
        )}
      </div>
    </div>
  )
}
