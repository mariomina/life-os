// features/reports/leverage.ts
// Story 8.7 — Funciones puras para Agent Leverage Report.

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LeverageMetrics {
  totalActivities: number
  aiActivities: number
  humanActivities: number
  mixedActivities: number
  aiPercentage: number // 0-100
  aiCompletedSuccessfully: number
  aiAccuracyRate: number // 0-1
  estimatedHumanHoursSaved: number // only counts completed ai activities with duration
}

export interface ROIByExecutorRow {
  executorType: string
  count: number
  totalMinutes: number
  avgMinutes: number
}

// ─── computeLeverageMetrics ───────────────────────────────────────────────────

type ActivityInput = {
  executorType: 'human' | 'ai' | 'mixed'
  status: string
  scheduledDurationMinutes: number | null
}

/**
 * Computes AI vs Human leverage metrics from a list of activities.
 * aiAccuracyRate = 0 when aiActivities = 0 (no division by zero).
 * estimatedHumanHoursSaved counts only ai activities with status='completed'
 * and non-null scheduledDurationMinutes.
 */
export function computeLeverageMetrics(activities: ActivityInput[]): LeverageMetrics {
  const total = activities.length
  const ai = activities.filter((a) => a.executorType === 'ai')
  const human = activities.filter((a) => a.executorType === 'human')
  const mixed = activities.filter((a) => a.executorType === 'mixed')
  const aiCompleted = ai.filter((a) => a.status === 'completed')
  const hoursSaved = aiCompleted.reduce((s, a) => s + (a.scheduledDurationMinutes ?? 0), 0) / 60

  return {
    totalActivities: total,
    aiActivities: ai.length,
    humanActivities: human.length,
    mixedActivities: mixed.length,
    aiPercentage: total > 0 ? Math.round((ai.length / total) * 100 * 10) / 10 : 0,
    aiCompletedSuccessfully: aiCompleted.length,
    aiAccuracyRate: ai.length > 0 ? aiCompleted.length / ai.length : 0,
    estimatedHumanHoursSaved: Math.round(hoursSaved * 10) / 10,
  }
}

// ─── computeROIByExecutorType ─────────────────────────────────────────────────

type ROIInput = {
  executorType: 'human' | 'ai' | 'mixed'
  scheduledDurationMinutes: number | null
}

/**
 * Groups activities by executor_type and computes count + total/avg duration.
 * Results sorted by count desc.
 */
export function computeROIByExecutorType(activities: ROIInput[]): ROIByExecutorRow[] {
  const groups = new Map<string, { count: number; totalMinutes: number }>()

  for (const a of activities) {
    const current = groups.get(a.executorType) ?? { count: 0, totalMinutes: 0 }
    groups.set(a.executorType, {
      count: current.count + 1,
      totalMinutes: current.totalMinutes + (a.scheduledDurationMinutes ?? 0),
    })
  }

  return Array.from(groups.entries())
    .map(([executorType, g]) => ({
      executorType,
      count: g.count,
      totalMinutes: g.totalMinutes,
      avgMinutes: g.count > 0 ? Math.round((g.totalMinutes / g.count) * 10) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count)
}
