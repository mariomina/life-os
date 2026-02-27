// features/inbox/alerts.ts
// Lógica pura de detección de acumulación en Inbox — sin side effects, sin dependencias externas.
// Story 6.5 — Procesamiento Manual + Alerta Inbox Acumulado >7 Días.

import type { InboxItem } from '@/lib/db/schema/inbox-items'

export interface InboxAccumulationAlert {
  type: 'warning'
  /** Número de items >7 días sin procesar */
  count: number
  /** Días desde el item más antiguo sin procesar */
  oldestDays: number
}

const ACCUMULATION_THRESHOLD_DAYS = 7
const MS_PER_DAY = 24 * 60 * 60 * 1000

/**
 * Detecta si hay items del inbox acumulados sin procesar por más de 7 días.
 *
 * Sólo considera items con status 'pending' o 'manual' (sin cerrar).
 * Items 'processed', 'discarded' o 'processing' se ignoran.
 *
 * @returns Alert con count y oldestDays, o null si no hay acumulación.
 */
export function getInboxAccumulationAlert(items: InboxItem[]): InboxAccumulationAlert | null {
  const now = Date.now()
  const threshold = ACCUMULATION_THRESHOLD_DAYS * MS_PER_DAY

  const oldItems = items.filter((item) => {
    if (item.status !== 'pending' && item.status !== 'manual') return false
    return now - new Date(item.createdAt).getTime() > threshold
  })

  if (oldItems.length === 0) return null

  const oldestMs = Math.max(...oldItems.map((i) => now - new Date(i.createdAt).getTime()))
  const oldestDays = Math.floor(oldestMs / MS_PER_DAY)

  return { type: 'warning', count: oldItems.length, oldestDays }
}
