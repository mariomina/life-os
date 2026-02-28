'use server'

// actions/weekly-review.ts
// Story 8.8 — Server Action for Weekly Review guiado 4 fases.

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { inboxItems } from '@/lib/db/schema/inbox-items'
import { eq, and, gte, lte, asc } from 'drizzle-orm'
import {
  getCalendarCommitmentRate,
  getHabitConsistencyReport,
  getOkrProgressReport,
  getTimeByArea,
  getAreaHealthTrends,
} from '@/actions/reports'
import { getActiveCorrelations, type CorrelationRow } from '@/actions/correlations'
import { generateReportInsights } from '@/actions/reports'
import { aggregateWeeklyMetrics, type WeeklyMetrics } from '@/features/reports/weekly'
import type { InboxItem } from '@/lib/db/schema/inbox-items'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface WeeklyReviewData {
  metrics: WeeklyMetrics
  insights: string
  patterns: CorrelationRow[]
  inboxItems: Pick<InboxItem, 'id' | 'rawText' | 'status' | 'createdAt'>[]
  pendingActivities: {
    id: string
    title: string
    status: string
    areaId: string | null
    scheduledAt: Date | null
    scheduledDurationMinutes: number | null
  }[]
  nextWeekActivities: {
    id: string
    title: string
    scheduledAt: Date | null
    scheduledDurationMinutes: number | null
  }[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getAuthUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

function settled<T>(result: PromiseSettledResult<T>, fallback: T): T {
  return result.status === 'fulfilled' ? result.value : fallback
}

// ─── Main Server Action ───────────────────────────────────────────────────────

/**
 * Aggregates all data sources for the Weekly Review wizard in a single call.
 * Uses Promise.allSettled so individual failures don't block the wizard.
 */
export async function getWeeklyReviewData(): Promise<WeeklyReviewData> {
  const userId = await getAuthUserId()

  const now = new Date()
  const nextWeekEnd = new Date(now)
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7)

  const [ccrR, habitsR, okrsR, timeR, trendsR, correlR, insightsR, inboxR, pendingR, nextWeekR] =
    await Promise.allSettled([
      getCalendarCommitmentRate('week'),
      getHabitConsistencyReport('week'),
      getOkrProgressReport(),
      getTimeByArea('week'),
      getAreaHealthTrends(),
      getActiveCorrelations(),
      generateReportInsights('week'),
      // Inbox items pending or processing
      db
        .select({
          id: inboxItems.id,
          rawText: inboxItems.rawText,
          status: inboxItems.status,
          createdAt: inboxItems.createdAt,
        })
        .from(inboxItems)
        .where(
          and(
            eq(inboxItems.userId, userId)
            // pending or processing — not yet actioned
          )
        )
        .orderBy(asc(inboxItems.createdAt))
        .limit(20),
      // Pending activities (backlog) — top 10 oldest
      db
        .select({
          id: stepsActivities.id,
          title: stepsActivities.title,
          status: stepsActivities.status,
          areaId: stepsActivities.areaId,
          scheduledAt: stepsActivities.scheduledAt,
          scheduledDurationMinutes: stepsActivities.scheduledDurationMinutes,
        })
        .from(stepsActivities)
        .where(and(eq(stepsActivities.userId, userId), eq(stepsActivities.status, 'pending')))
        .orderBy(asc(stepsActivities.createdAt))
        .limit(10),
      // Next 7 days activities
      db
        .select({
          id: stepsActivities.id,
          title: stepsActivities.title,
          scheduledAt: stepsActivities.scheduledAt,
          scheduledDurationMinutes: stepsActivities.scheduledDurationMinutes,
        })
        .from(stepsActivities)
        .where(
          and(
            eq(stepsActivities.userId, userId),
            gte(stepsActivities.scheduledAt, now),
            lte(stepsActivities.scheduledAt, nextWeekEnd)
          )
        )
        .orderBy(asc(stepsActivities.scheduledAt))
        .limit(20),
    ])

  const ccr = settled(ccrR, { planned: 0, completed: 0, rate: null })
  const habits = settled(habitsR, [])
  const okrs = settled(okrsR, [])
  const timeByArea = settled(timeR, [])
  const trends = settled(trendsR, [])
  const correlations = settled(correlR, [])
  const insightsResult = settled(insightsR, null)
  const inbox = settled(inboxR, [])
  const pending = settled(pendingR, [])
  const nextWeek = settled(nextWeekR, [])

  const metrics = aggregateWeeklyMetrics(
    ccr,
    habits,
    okrs,
    timeByArea.map((r) => ({ areaName: r.areaName, totalSeconds: r.totalSeconds })),
    trends.map((r) => ({ areaName: r.areaName, trend: r.trend }))
  )

  // Filter to non-neutral patterns
  const patterns = correlations.filter((c) => c.type !== 'neutral' && c.tier === 'full')

  const insightsText =
    insightsResult?.insights ??
    `CCR: ${ccr.rate !== null ? Math.round(ccr.rate * 100) + '%' : 'n/d'}. Revisa tus correlaciones activas para identificar patrones de mejora.`

  return {
    metrics,
    insights: insightsText,
    patterns,
    inboxItems: inbox,
    pendingActivities: pending,
    nextWeekActivities: nextWeek,
  }
}
