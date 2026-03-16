// lib/analytics/track.ts
// Story 10.19 — Analytics de Actividad del Usuario.
// Fire-and-forget: never blocks the UI, fails silently on network error.

/**
 * Tracks a user interaction event.
 * Sends to POST /api/analytics without awaiting — void return guarantees no UI block.
 */
export function track(eventType: string, metadata?: Record<string, unknown>): void {
  void fetch('/api/analytics', {
    method: 'POST',
    body: JSON.stringify({ eventType, metadata }),
    headers: { 'Content-Type': 'application/json' },
  }).catch(() => {}) // silencioso en error de red
}
