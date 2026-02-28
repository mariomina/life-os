'use server'

// actions/reports.ts
// Story 8.1 — Server Actions para informes de tiempo.
// Story 8.2 — Server Actions para métricas agregadas.
// Story 8.3 — Motor de correlaciones.
// Story 8.6 — Generación de insights con LLM.
// Story 8.7 — Agent Leverage Report.

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db/client'
import { timeEntries } from '@/lib/db/schema/time-entries'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { areas } from '@/lib/db/schema/areas'
import { tasks } from '@/lib/db/schema/tasks'
import { workflows } from '@/lib/db/schema/workflows'
import { projects } from '@/lib/db/schema/projects'
import { habits } from '@/lib/db/schema/habits'
import { areaScores } from '@/lib/db/schema/area-scores'
import { okrs } from '@/lib/db/schema/okrs'
import { correlations } from '@/lib/db/schema/correlations'
import { eq, and, gte, lte, isNotNull, isNull, sql, desc, avg, count } from 'drizzle-orm'
import { getPeriodRange, type ReportPeriod } from '@/features/reports/periods'
import {
  computeHabitConsistency,
  computeCCR,
  computeAreaHealthTrend,
} from '@/features/reports/metrics'
import { buildInsightPrompt, type CorrelationSummary } from '@/features/reports/insights'
import { getLLMProvider } from '@/lib/llm/factory'

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

// ─── Story 8.1: Time by Area ──────────────────────────────────────────────────

export interface TimeByAreaRow {
  areaId: string
  areaName: string
  totalSeconds: number
}

/**
 * Returns time invested per area in the given period.
 * JOIN: time_entries → steps_activities → areas
 * Only completed time entries (durationSeconds IS NOT NULL) are counted.
 */
export async function getTimeByArea(period: ReportPeriod): Promise<TimeByAreaRow[]> {
  const userId = await getAuthenticatedUserId()
  const { from, to } = getPeriodRange(period)

  const rows = await db
    .select({
      areaId: stepsActivities.areaId,
      areaName: areas.name,
      totalSeconds: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
    })
    .from(timeEntries)
    .innerJoin(stepsActivities, eq(timeEntries.stepActivityId, stepsActivities.id))
    .leftJoin(areas, eq(stepsActivities.areaId, areas.id))
    .where(
      and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.createdAt, from),
        lte(timeEntries.createdAt, to),
        isNotNull(timeEntries.durationSeconds)
      )
    )
    .groupBy(stepsActivities.areaId, areas.name)
    .orderBy(desc(sql`SUM(${timeEntries.durationSeconds})`))

  return rows.map((r) => ({
    areaId: r.areaId ?? 'none',
    areaName: r.areaName ?? 'Sin área',
    totalSeconds: Number(r.totalSeconds),
  }))
}

// ─── Story 8.1: Time by Project ───────────────────────────────────────────────

export interface TimeByProjectRow {
  projectId: string
  projectName: string
  totalSeconds: number
}

/**
 * Returns time invested per project in the given period.
 * JOIN chain: time_entries → steps_activities → tasks → workflows → projects
 * Activities without a project are grouped under projectId='none'.
 */
export async function getTimeByProject(period: ReportPeriod): Promise<TimeByProjectRow[]> {
  const userId = await getAuthenticatedUserId()
  const { from, to } = getPeriodRange(period)

  const rows = await db
    .select({
      projectId: projects.id,
      projectTitle: projects.title,
      totalSeconds: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
    })
    .from(timeEntries)
    .innerJoin(stepsActivities, eq(timeEntries.stepActivityId, stepsActivities.id))
    .leftJoin(tasks, eq(stepsActivities.taskId, tasks.id))
    .leftJoin(workflows, eq(tasks.workflowId, workflows.id))
    .leftJoin(projects, eq(workflows.projectId, projects.id))
    .where(
      and(
        eq(timeEntries.userId, userId),
        gte(timeEntries.createdAt, from),
        lte(timeEntries.createdAt, to),
        isNotNull(timeEntries.durationSeconds)
      )
    )
    .groupBy(projects.id, projects.title)
    .orderBy(desc(sql`SUM(${timeEntries.durationSeconds})`))

  const result: TimeByProjectRow[] = rows.map((r) => ({
    projectId: r.projectId ?? 'none',
    projectName: r.projectTitle ?? 'Sin proyecto',
    totalSeconds: Number(r.totalSeconds),
  }))

  // Ensure 'Sin proyecto' is always last
  result.sort((a, b) => {
    if (a.projectId === 'none') return 1
    if (b.projectId === 'none') return -1
    return b.totalSeconds - a.totalSeconds
  })

  return result
}

// ─── Story 8.2: Habit Consistency ────────────────────────────────────────────

export type { HabitConsistencyItem } from '@/features/reports/metrics'

/**
 * Returns habit completion rate per habit in the given period.
 * Counts activities with habitId != null; planned vs completed.
 */
export async function getHabitConsistencyReport(period: ReportPeriod) {
  const userId = await getAuthenticatedUserId()
  const { from, to } = getPeriodRange(period)

  const rows = await db
    .select({
      habitId: stepsActivities.habitId,
      habitName: habits.title,
      planned: sql<number>`COUNT(*) FILTER (WHERE ${stepsActivities.planned} = true)`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${stepsActivities.planned} = true AND ${stepsActivities.status} = 'completed')`,
    })
    .from(stepsActivities)
    .innerJoin(habits, eq(stepsActivities.habitId, habits.id))
    .where(
      and(
        eq(stepsActivities.userId, userId),
        isNotNull(stepsActivities.habitId),
        gte(stepsActivities.scheduledAt, from),
        lte(stepsActivities.scheduledAt, to)
      )
    )
    .groupBy(stepsActivities.habitId, habits.title)

  const mapped = rows.map((r) => ({
    habitId: r.habitId ?? '',
    habitName: r.habitName ?? '',
    planned: Number(r.planned),
    completed: Number(r.completed),
  }))

  return computeHabitConsistency(mapped)
}

// ─── Story 8.2: Calendar Commitment Rate (CCR) ───────────────────────────────

export type { CCRResult } from '@/features/reports/metrics'

/**
 * Calendar Commitment Rate: ratio of planned activities that were completed.
 */
export async function getCalendarCommitmentRate(period: ReportPeriod) {
  const userId = await getAuthenticatedUserId()
  const { from, to } = getPeriodRange(period)

  const rows = await db
    .select({
      planned: sql<number>`COUNT(*) FILTER (WHERE ${stepsActivities.planned} = true)`,
      completed: sql<number>`COUNT(*) FILTER (WHERE ${stepsActivities.planned} = true AND ${stepsActivities.status} = 'completed')`,
    })
    .from(stepsActivities)
    .where(
      and(
        eq(stepsActivities.userId, userId),
        gte(stepsActivities.scheduledAt, from),
        lte(stepsActivities.scheduledAt, to)
      )
    )

  const row = rows[0]
  return computeCCR(Number(row?.planned ?? 0), Number(row?.completed ?? 0))
}

// ─── Story 8.2: OKR Progress ─────────────────────────────────────────────────

export interface OkrProgressItem {
  okrId: string
  objective: string
  krs: { krId: string; title: string; progress: number }[]
  avgProgress: number
}

/**
 * Returns active annual OKRs with their key results and average progress.
 */
export async function getOkrProgressReport(): Promise<OkrProgressItem[]> {
  const userId = await getAuthenticatedUserId()

  const annualOkrs = await db
    .select({ id: okrs.id, title: okrs.title, progress: okrs.progress })
    .from(okrs)
    .where(and(eq(okrs.userId, userId), eq(okrs.type, 'annual'), eq(okrs.status, 'active')))

  if (annualOkrs.length === 0) return []

  const annualIds = annualOkrs.map((o) => o.id)

  const keyResults = await db
    .select({ id: okrs.id, parentId: okrs.parentId, title: okrs.title, progress: okrs.progress })
    .from(okrs)
    .where(and(eq(okrs.userId, userId), eq(okrs.type, 'key_result'), eq(okrs.status, 'active')))

  return annualOkrs.map((annual) => {
    const krs = keyResults
      .filter((kr) => kr.parentId === annual.id)
      .map((kr) => ({ krId: kr.id, title: kr.title, progress: kr.progress }))
    const avgProgress =
      krs.length > 0
        ? Math.round(krs.reduce((s, kr) => s + kr.progress, 0) / krs.length)
        : annual.progress
    return { okrId: annual.id, objective: annual.title, krs, avgProgress }
  })
}

// ─── Story 8.2: Area Health Trends ───────────────────────────────────────────

export interface AreaHealthTrendRow {
  areaId: string
  areaName: string
  currentScore: number
  previousScore: number
  trend: 'improving' | 'declining' | 'stable'
}

/**
 * Compares average area scores: last 30 days vs. prior 30 days.
 */
export async function getAreaHealthTrends(): Promise<AreaHealthTrendRow[]> {
  const userId = await getAuthenticatedUserId()
  const now = new Date()
  const thirtyDaysAgo = new Date(now)
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const sixtyDaysAgo = new Date(now)
  sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60)

  const thirtyDaysAgoDate = thirtyDaysAgo.toISOString().split('T')[0]
  const sixtyDaysAgoDate = sixtyDaysAgo.toISOString().split('T')[0]
  const nowDate = now.toISOString().split('T')[0]

  const currentRows = await db
    .select({
      areaId: areaScores.areaId,
      areaName: areas.name,
      avgScore: sql<number>`AVG(${areaScores.score})`,
    })
    .from(areaScores)
    .leftJoin(areas, eq(areaScores.areaId, areas.id))
    .where(
      and(
        eq(areaScores.userId, userId),
        gte(areaScores.scoredAt, thirtyDaysAgoDate),
        lte(areaScores.scoredAt, nowDate)
      )
    )
    .groupBy(areaScores.areaId, areas.name)

  const previousRows = await db
    .select({
      areaId: areaScores.areaId,
      avgScore: sql<number>`AVG(${areaScores.score})`,
    })
    .from(areaScores)
    .where(
      and(
        eq(areaScores.userId, userId),
        gte(areaScores.scoredAt, sixtyDaysAgoDate),
        lte(areaScores.scoredAt, thirtyDaysAgoDate)
      )
    )
    .groupBy(areaScores.areaId)

  const previousMap = new Map(previousRows.map((r) => [r.areaId, Number(r.avgScore)]))

  return currentRows.map((r) => {
    const currentScore = Math.round(Number(r.avgScore))
    const previousScore = Math.round(previousMap.get(r.areaId) ?? currentScore)
    return {
      areaId: r.areaId,
      areaName: r.areaName ?? 'Área',
      currentScore,
      previousScore,
      trend: computeAreaHealthTrend(currentScore, previousScore),
    }
  })
}

// ─── Story 8.6: Generate LLM Insights ────────────────────────────────────────

export interface InsightsResult {
  insights: string
  generatedAt: Date
  provider: string
}

/**
 * Generates natural-language insights using an LLM.
 * Graceful fallback: on any error, returns a static summary based on raw numbers.
 */
export async function generateReportInsights(
  period: ReportPeriod = 'week'
): Promise<InsightsResult> {
  const userId = await getAuthenticatedUserId()

  // Gather data in parallel
  const [ccrData, habitData, okrData, correlationRows] = await Promise.all([
    getCalendarCommitmentRate(period),
    getHabitConsistencyReport(period),
    getOkrProgressReport(),
    db
      .select({
        entityAType: correlations.entityAType,
        entityBType: correlations.entityBType,
        entityAId: correlations.entityAId,
        entityBId: correlations.entityBId,
        type: correlations.type,
        tier: correlations.tier,
        correlationValue: correlations.correlationValue,
      })
      .from(correlations)
      .where(
        and(
          eq(correlations.userId, userId),
          eq(correlations.isActive, true),
          eq(correlations.tier, 'full')
        )
      )
      .orderBy(desc(sql`ABS(${correlations.correlationValue})`))
      .limit(10),
  ])

  const habitConsistencyAvg =
    habitData.length > 0 ? habitData.reduce((s, h) => s + h.rate, 0) / habitData.length : 0
  const okrProgressAvg =
    okrData.length > 0 ? okrData.reduce((s, o) => s + o.avgProgress, 0) / okrData.length : 0

  const periodLabels: Record<ReportPeriod, string> = {
    week: 'última semana',
    month: 'último mes',
    quarter: 'último trimestre',
  }

  const summary = {
    ccrRate: ccrData.rate,
    habitConsistencyAvg,
    okrProgressAvg,
    periodLabel: periodLabels[period],
  }

  const correlationSummaries: CorrelationSummary[] = correlationRows.map((c) => ({
    entityAType: c.entityAType,
    entityAName: c.entityAId ?? '',
    entityBType: c.entityBType,
    entityBName: c.entityBId ?? '',
    type: c.type,
    tier: c.tier,
    coefficient: Number(c.correlationValue ?? 0),
  }))

  const prompt = buildInsightPrompt(summary, correlationSummaries)

  try {
    const llm = getLLMProvider()
    const insights = await llm.generateInsight(prompt)
    return { insights, generatedAt: new Date(), provider: llm.providerName }
  } catch {
    // AC4: Graceful fallback
    const ccrLabel = ccrData.rate !== null ? `${Math.round(ccrData.rate * 100)}%` : 'no disponible'
    const consistencyLabel = `${Math.round(habitConsistencyAvg * 100)}%`
    const okrLabel = `${Math.round(okrProgressAvg)}%`
    const fallback = `Tu CCR esta ${periodLabels[period]} fue ${ccrLabel}. Mantuviste una consistencia de hábitos del ${consistencyLabel}. El progreso promedio en OKRs es ${okrLabel}. No hay correlaciones con datos suficientes aún.`
    return { insights: fallback, generatedAt: new Date(), provider: 'fallback' }
  }
}
