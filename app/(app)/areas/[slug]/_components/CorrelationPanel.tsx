// app/(app)/areas/[slug]/_components/CorrelationPanel.tsx
// Panel de correlaciones detectadas para la vista de detalle de un área.
// Story 11.9 — Motor de Correlaciones.
//
// Solo muestra correlaciones significativas (|r| > 0.3, ≥ 21 días de datos).
// [Source: docs/briefs/areas-redesign-brief.md#fase5]

import type { SubareaCorrelation } from '@/lib/areas/correlation-detector'

interface CorrelationPanelProps {
  correlations: SubareaCorrelation[]
}

export function CorrelationPanel({ correlations }: CorrelationPanelProps) {
  const significant = correlations.filter((c) => c.isSignificant)

  if (significant.length === 0) return null

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-foreground">Correlaciones detectadas</h2>
      <div className="rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="h-px bg-border mb-3" />
        {significant.map((c, i) => (
          <div key={i} className="flex items-start gap-2 text-xs">
            <span className={c.direction === 'positive' ? 'text-green-500' : 'text-red-500'}>
              {c.direction === 'positive' ? '↗' : '↘'}
            </span>
            <span className="text-foreground leading-relaxed">{c.insightMessage}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
