'use client'

// app/(app)/areas/_components/SubareaCheckinModal.tsx
// Modal de checkin subjetivo por sub-área.
// Story 11.5 — Checkin Periódico por Sub-área.
//
// Flujo: preguntas pendientes una a una, escala 1-10, progress bar.
// Al completar todas: cierra modal y revalida /areas.

import { useState, useTransition } from 'react'
import { submitSubareaCheckin } from '@/actions/checkin'
import { getCheckinQuestion } from '@/lib/areas/checkin-questions'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'

interface SubareaCheckinModalProps {
  pendingSubareas: AreaSubarea[]
  onClose: () => void
}

export function SubareaCheckinModal({ pendingSubareas, onClose }: SubareaCheckinModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedScore, setSelectedScore] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const current = pendingSubareas[currentIndex]
  const question = current ? getCheckinQuestion(current.slug) : undefined
  const total = pendingSubareas.length
  const isLast = currentIndex === total - 1

  function handleSubmit() {
    if (selectedScore === null || !current) return
    setError(null)

    startTransition(async () => {
      const result = await submitSubareaCheckin(current.id, selectedScore, new Date())
      if (result.error) {
        setError(result.error)
        return
      }

      if (isLast) {
        onClose()
      } else {
        setCurrentIndex((i) => i + 1)
        setSelectedScore(null)
      }
    })
  }

  if (!current || !question) {
    onClose()
    return null
  }

  const progressPct = Math.round((currentIndex / total) * 100)

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-md rounded-2xl bg-background border border-border shadow-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p id="checkin-modal-title" className="text-sm font-semibold text-foreground">
              Checkin subjetivo
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Pregunta {currentIndex + 1} de {total}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            className="text-muted-foreground hover:text-foreground transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Sub-area name */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {current.name}
        </p>

        {/* Question */}
        <p className="text-base font-medium text-foreground leading-snug">{question.question}</p>

        {/* Scale 1-10 */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground px-1">
            <span>Muy bajo</span>
            <span>Excelente</span>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
              <button
                key={n}
                onClick={() => setSelectedScore(n)}
                className={`flex-1 min-w-[2.2rem] rounded-lg border py-2 text-sm font-medium transition-colors ${
                  selectedScore === n
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background text-foreground hover:border-primary/50 hover:bg-accent'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded px-2 py-1">
            {error}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 justify-end pt-1">
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-2 text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={selectedScore === null || isPending}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {isPending ? 'Guardando...' : isLast ? 'Finalizar' : 'Siguiente'}
          </button>
        </div>
      </div>
    </div>
  )
}
