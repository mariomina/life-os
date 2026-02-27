'use server'

// actions/reports.ts
// Story 8.1 — Server Actions para informes de tiempo.
// Story 8.2 — Server Actions para métricas agregadas.
// Story 8.3 — Motor de correlaciones.
// Story 8.6 — Generación de insights con LLM.
// Story 8.7 — Agent Leverage Report.

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db } from '@/lib/db/client'
import { timeEntries } from '@/lib/db/schema/time-entries'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { areas } from '@/lib/db/schema/areas'
import { tasks } from '@/lib/db/schema/tasks'
import { workflows } from '@/lib/db/schema/workflows'
import { projects } from '@/lib/db/schema/projects'
import { eq, and, gte, lte, isNotNull, sql, desc } from 'drizzle-orm'
import { getPeriodRange, type ReportPeriod } from '@/features/reports/periods'

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
