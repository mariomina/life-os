'use client'

// components/okrs/AnnualOKRList.tsx
// Lista de OKRs anuales con OKRImpactBadge y formulario de creación.
// Aplica la regla Buffett 5/25: deshabilita "Nuevo OKR" si ya hay MAX_ANNUAL_OKRS activos.

import { useState, useTransition } from 'react'
import { OKRForm } from '@/components/okrs/OKRForm'
import { AnnualOKRCard } from '@/components/okrs/AnnualOKRCard'
import { createAnnualOKR } from '@/actions/okrs'
import { MAX_ANNUAL_OKRS } from '@/lib/utils/okr-constants'
import type { OKR } from '@/lib/db/schema/okrs'
import type { Area } from '@/lib/db/schema/areas'
import type { AreaScore } from '@/lib/db/schema/area-scores'

interface AnnualOKRListProps {
  /** OKRs anuales del año actual cargados en servidor. */
  annualOKRs: OKR[]
  /** Key Results de todos los OKRs anuales cargados en servidor. */
  krs: OKR[]
  /** Áreas del usuario — para OKRForm (hierarchy guard + impact). */
  areas: Area[]
  /** Historial reciente de scores — para OKRForm (hierarchy guard). */
  scoreHistory: AreaScore[]
  /** Año actual. */
  year: number
}

/**
 * Lista de OKRs anuales con soporte para crear nuevos y ver KRs anidados.
 */
export function AnnualOKRList({ annualOKRs, krs, areas, scoreHistory, year }: AnnualOKRListProps) {
  const [showForm, setShowForm] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const activeCount = annualOKRs.filter((o) => o.status === 'active').length
  const isBuffettLimitReached = activeCount >= MAX_ANNUAL_OKRS

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
        {annualOKRs.map((okr) => (
          <AnnualOKRCard
            key={okr.id}
            okr={okr}
            areas={areas}
            krs={krs.filter((kr) => kr.parentId === okr.id)}
          />
        ))}
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
