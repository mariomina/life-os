'use client'

// components/shared/SubareaCheckinBanner.tsx
// Banner no intrusivo para checkins subjetivos pendientes por sub-área.
// Story 11.5 — Checkin Periódico por Sub-área.
//
// Aparece en /areas cuando hay sub-áreas con checkins vencidos.
// Descartable con persistencia en localStorage por 24h.

import { useState } from 'react'
import type { AreaSubarea } from '@/lib/db/schema/area-subareas'

const DISMISS_KEY = 'subarea_checkin_dismissed_at'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000 // 24h

function readDismissed(): boolean {
  try {
    const dismissedAt = localStorage.getItem(DISMISS_KEY)
    if (!dismissedAt) return false
    const elapsed = Date.now() - parseInt(dismissedAt, 10)
    if (elapsed < DISMISS_TTL_MS) return true
    localStorage.removeItem(DISMISS_KEY)
  } catch {
    // localStorage unavailable — show banner
  }
  return false
}

interface SubareaCheckinBannerProps {
  pendingSubareas: AreaSubarea[]
  onOpenModal: () => void
}

export function SubareaCheckinBanner({ pendingSubareas, onOpenModal }: SubareaCheckinBannerProps) {
  // Lazy initializer reads localStorage once — avoids setState-in-effect lint error
  const [dismissed, setDismissed] = useState(readDismissed)

  function handleDismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, Date.now().toString())
    } catch {
      // ignore
    }
    setDismissed(true)
  }

  if (dismissed || pendingSubareas.length === 0) return null

  const count = pendingSubareas.length
  const label =
    count === 1 ? 'pregunta pendiente de esta semana' : 'preguntas pendientes de esta semana'

  return (
    <div
      role="alert"
      aria-live="polite"
      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-accent px-4 py-3 text-sm"
    >
      <span className="text-foreground">
        <span className="mr-1">📋</span>
        Tienes <strong>{count}</strong> {label}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenModal}
          className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Responder ahora
        </button>
        <button
          onClick={handleDismiss}
          aria-label="Descartar banner"
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          ×
        </button>
      </div>
    </div>
  )
}
