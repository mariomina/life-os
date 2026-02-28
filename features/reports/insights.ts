// features/reports/insights.ts
// Story 8.6 — buildInsightPrompt: pure function to build LLM prompt from metrics + correlations.

// ─── Types (mirror subset of DB types to keep pure) ───────────────────────────

export interface MetricsSummary {
  ccrRate: number | null // 0-1 (null if no planned activities)
  habitConsistencyAvg: number // 0-1
  okrProgressAvg: number // 0-100
  periodLabel: string // e.g. "última semana"
}

export interface CorrelationSummary {
  entityAType: string
  entityAName: string
  entityBType: string
  entityBName: string
  type: string // 'positive' | 'negative' | 'neutral'
  tier: string // 'full' | 'provisional' | 'gathering'
  coefficient: number
}

// ─── Sanitize helper (prevent prompt injection) ───────────────────────────────

function sanitize(value: string): string {
  return value.replace(/[<>{}"'`\\]/g, '').slice(0, 80)
}

// ─── Main pure function ───────────────────────────────────────────────────────

/**
 * Builds a structured LLM prompt from metrics summary and active correlations.
 * Only includes full-tier non-neutral correlations (max 5).
 */
export function buildInsightPrompt(
  summary: MetricsSummary,
  correlations: CorrelationSummary[]
): string {
  const ccrPct =
    summary.ccrRate !== null ? `${Math.round(summary.ccrRate * 100)}%` : 'no disponible'
  const consistencyPct = `${Math.round(summary.habitConsistencyAvg * 100)}%`
  const okrPct = `${Math.round(summary.okrProgressAvg)}%`

  const significant = correlations
    .filter((c) => c.tier === 'full' && c.type !== 'neutral')
    .slice(0, 5)

  const correlationLines =
    significant.length > 0
      ? significant
          .map((c) => {
            const aName = sanitize(c.entityAName)
            const bName = sanitize(c.entityBName)
            const sign = c.type === 'positive' ? 'positiva' : 'negativa'
            return `- ${sanitize(c.entityAType)} "${aName}" → correlación ${sign} (${c.coefficient.toFixed(2)}) con ${sanitize(c.entityBType)} "${bName}"`
          })
          .join('\n')
      : '- No hay correlaciones con datos suficientes aún.'

  return `Eres un asistente de productividad personal. Analiza los siguientes datos del usuario y genera exactamente 3 insights concretos en español. Cada insight debe tener 2-3 frases y ser específico con los datos proporcionados.

## Métricas de ${sanitize(summary.periodLabel)}

- Tasa de Compromiso (CCR): ${ccrPct}
- Consistencia de Hábitos promedio: ${consistencyPct}
- Progreso OKRs promedio: ${okrPct}

## Correlaciones significativas

${correlationLines}

## Instrucción

Genera 3 insights concretos basados en los datos anteriores. Sé específico con los números. Cada insight debe empezar con un emoji relevante y tener 2-3 frases.`
}
