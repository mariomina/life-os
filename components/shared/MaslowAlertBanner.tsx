'use client'

// components/shared/MaslowAlertBanner.tsx
// Client Component — stacked alert banners for Maslow rule engine.
// Story 11.8 — AlertBanner: Cascada, Balance, Crisis, Progresión.
// Source: docs/briefs/areas-redesign-brief.md#6-reglas

import { useState } from 'react'
import { X } from 'lucide-react'
import type { MaslowAlert } from '@/features/maslow/alert-engine'

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'dismissed_maslow_alerts'
const DISMISS_TTL_MS = 24 * 60 * 60 * 1000
const MAX_VISIBLE = 3

// ─── Types ────────────────────────────────────────────────────────────────────

type DismissedMap = Record<string, number>

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Lazy initializer — reads and cleans expired dismiss entries from localStorage. */
function readDismissed(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return new Set()
    const map: DismissedMap = JSON.parse(raw)
    const now = Date.now()
    const valid = new Set<string>()
    const cleaned: DismissedMap = {}
    for (const [id, exp] of Object.entries(map)) {
      if (exp > now) {
        valid.add(id)
        cleaned[id] = exp
      }
    }
    localStorage.setItem(LS_KEY, JSON.stringify(cleaned))
    return valid
  } catch {
    return new Set()
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const TYPE_STYLES: Record<MaslowAlert['type'], string> = {
  critical:
    'border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200',
  warning:
    'border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200',
  info: 'border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface MaslowAlertBannerProps {
  alerts: MaslowAlert[]
}

export function MaslowAlertBanner({ alerts }: MaslowAlertBannerProps) {
  // Lazy initializer avoids useEffect + avoids SSR hydration mismatch for this client-only component
  const [dismissed, setDismissed] = useState<Set<string>>(readDismissed)

  const visible = alerts.filter((a) => !dismissed.has(a.id)).slice(0, MAX_VISIBLE)

  if (visible.length === 0) return null

  function handleDismiss(id: string) {
    setDismissed((prev) => {
      const next = new Set(prev)
      next.add(id)
      try {
        const raw = localStorage.getItem(LS_KEY)
        const map: DismissedMap = raw ? JSON.parse(raw) : {}
        map[id] = Date.now() + DISMISS_TTL_MS
        localStorage.setItem(LS_KEY, JSON.stringify(map))
      } catch {
        // Ignore storage errors (private browsing, quota exceeded, etc.)
      }
      return next
    })
  }

  return (
    <div className="space-y-2" role="alert" aria-live="polite">
      {visible.map((alert) => (
        <div
          key={alert.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${TYPE_STYLES[alert.type]}`}
        >
          <p className="flex-1">{alert.message}</p>
          {alert.canDismiss && (
            <button
              onClick={() => handleDismiss(alert.id)}
              aria-label="Cerrar alerta"
              className="shrink-0 mt-0.5 opacity-60 hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
