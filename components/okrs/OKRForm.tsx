'use client'

import { useState } from 'react'
import { HierarchyWarning } from '@/components/shared/HierarchyWarning'
import { OKRImpactBadge } from '@/components/okrs/OKRImpactBadge'
import { checkHierarchyBlock } from '@/features/maslow/hierarchy-guard'
import { calculateOKRImpact, buildScoreMap } from '@/features/maslow/okr-impact'
import type { Area } from '@/lib/db/schema/areas'
import type { AreaScore } from '@/lib/db/schema/area-scores'

interface OKRFormProps {
  /** All user areas — passed from Server Component */
  areas: Area[]
  /** Recent area score history (≥30 days) — passed from Server Component */
  scoreHistory: AreaScore[]
  /** Called with form data when submission is allowed */
  onSubmit?: (data: { title: string; areaId: string; year: number }) => void
}

const HIGH_LEVELS = new Set([7, 8])

/**
 * Base OKR creation form (annual OKRs only).
 * Enforces the hierarchy guard: if a D-Needs area (level 1-2) is in crisis
 * (score <50% for >14 consecutive days), creating OKRs linked to B-Needs
 * advanced areas (level 7-8) is soft-blocked.
 *
 * Data is passed as props from the Server Component parent — no client-side fetching.
 */
export function OKRForm({ areas, scoreHistory, onSubmit }: OKRFormProps) {
  const currentYear = new Date().getFullYear()

  const [title, setTitle] = useState('')
  const [areaId, setAreaId] = useState('')
  const [year, setYear] = useState(currentYear)

  const selectedArea = areas.find((a) => a.id === areaId)
  const isHighLevel = selectedArea ? HIGH_LEVELS.has(selectedArea.maslowLevel) : false

  // Compute hierarchy block only when area is level 7-8
  const guardResult = isHighLevel
    ? checkHierarchyBlock(areas, scoreHistory)
    : { isBlocked: false, blockedAreas: [] }

  // Compute OKR Impact Score when an area is selected
  const impactResult = areaId ? calculateOKRImpact({ areaId }, areas, buildScoreMap(areas)) : null

  const isBlocked = isHighLevel && guardResult.isBlocked
  const canSubmit = title.trim().length > 0 && areaId !== '' && !isBlocked

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    onSubmit?.({ title: title.trim(), areaId, year })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Hierarchy warning — shown only when area is level 7-8 and block is active */}
      {isHighLevel && guardResult.isBlocked && (
        <HierarchyWarning blockedAreas={guardResult.blockedAreas} />
      )}

      {/* Title */}
      <div className="space-y-1">
        <label htmlFor="okr-title" className="block text-sm font-medium">
          Título del OKR
        </label>
        <input
          id="okr-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ej: Alcanzar independencia financiera"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
          required
        />
      </div>

      {/* Area selector */}
      <div className="space-y-1">
        <label htmlFor="okr-area" className="block text-sm font-medium">
          Área vinculada
        </label>
        <select
          id="okr-area"
          value={areaId}
          onChange={(e) => setAreaId(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
          required
        >
          <option value="">Selecciona un área</option>
          {areas.map((area) => (
            <option key={area.id} value={area.id}>
              {area.name} (Nivel {area.maslowLevel})
            </option>
          ))}
        </select>

        {/* OKR Impact Score badge — shown when an area is selected */}
        {impactResult && impactResult.deltaPoints > 0 && (
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">Impacto estimado:</span>
            <OKRImpactBadge result={impactResult} />
          </div>
        )}
      </div>

      {/* Year */}
      <div className="space-y-1">
        <label htmlFor="okr-year" className="block text-sm font-medium">
          Año
        </label>
        <input
          id="okr-year"
          type="number"
          value={year}
          onChange={(e) => setYear(Number(e.target.value))}
          min={currentYear}
          max={currentYear + 5}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900"
          required
        />
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!canSubmit}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-600"
      >
        {isBlocked ? 'Bloqueado — resuelve la crisis D-Needs primero' : 'Crear OKR'}
      </button>
    </form>
  )
}
