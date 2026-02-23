// lib/db/queries/okrs.ts
// Queries de lectura para la tabla okrs.
// Todas las funciones requieren userId explícito — no confiar solo en RLS.

import { eq, and, count, sum, isNotNull } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { okrs } from '@/lib/db/schema/okrs'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { timeEntries } from '@/lib/db/schema/time-entries'
import type { OKR } from '@/lib/db/schema/okrs'

/**
 * Retorna el OKR de tipo 'vision' del usuario, o null si no existe.
 * El usuario tiene máximo un registro vision (upsert garantiza unicidad).
 */
export async function getVision(userId: string): Promise<OKR | null> {
  assertDatabaseUrl()
  const rows = await db
    .select()
    .from(okrs)
    .where(and(eq(okrs.userId, userId), eq(okrs.type, 'vision')))
    .limit(1)
  return rows[0] ?? null
}

/**
 * Retorna todos los OKRs anuales del usuario para el año dado.
 * Incluye todos los estados (active, completed, cancelled, paused).
 */
export async function getAnnualOKRs(userId: string, year: number): Promise<OKR[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(okrs)
    .where(and(eq(okrs.userId, userId), eq(okrs.type, 'annual'), eq(okrs.year, year)))
}

/**
 * Cuenta los OKRs anuales con status='active' para el año dado.
 * Usado para validar la regla Buffett 5/25 (máx 3 activos).
 */
export async function countActiveAnnualOKRs(userId: string, year: number): Promise<number> {
  assertDatabaseUrl()
  const result = await db
    .select({ value: count() })
    .from(okrs)
    .where(
      and(
        eq(okrs.userId, userId),
        eq(okrs.type, 'annual'),
        eq(okrs.year, year),
        eq(okrs.status, 'active')
      )
    )
  return result[0]?.value ?? 0
}

/**
 * Retorna todos los KRs (Key Results) hijos de un OKR anual.
 * Ordena por trimestre (Q1-Q4).
 */
export async function getKRsByAnnualOKR(userId: string, annualOkrId: string): Promise<OKR[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(okrs)
    .where(
      and(eq(okrs.userId, userId), eq(okrs.parentId, annualOkrId), eq(okrs.type, 'key_result'))
    )
    .orderBy(okrs.quarter)
}

/**
 * Retorna todos los KRs del usuario filtrados por año y trimestre.
 * Útil para dashboards tácticos trimestrales.
 */
export async function getKRsByQuarter(
  userId: string,
  year: number,
  quarter: 'Q1' | 'Q2' | 'Q3' | 'Q4'
): Promise<OKR[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(okrs)
    .where(
      and(
        eq(okrs.userId, userId),
        eq(okrs.type, 'key_result'),
        eq(okrs.year, year),
        eq(okrs.quarter, quarter)
      )
    )
}

/**
 * Retorna todos los KRs del usuario para el año dado.
 */
export async function getKRsByYear(userId: string, year: number): Promise<OKR[]> {
  assertDatabaseUrl()
  return db
    .select()
    .from(okrs)
    .where(and(eq(okrs.userId, userId), eq(okrs.type, 'key_result'), eq(okrs.year, year)))
    .orderBy(okrs.quarter)
}

// ----------------------------------------------------------------
// KR Progress Calculation (Story 3.7)
// ----------------------------------------------------------------

/**
 * Suma total de segundos registrados en time_entries para activities
 * vinculadas al KR dado, filtradas por userId.
 */
async function sumTimeEntriesForKR(userId: string, krId: string): Promise<number> {
  const result = await db
    .select({ total: sum(timeEntries.durationSeconds) })
    .from(timeEntries)
    .innerJoin(stepsActivities, eq(timeEntries.stepActivityId, stepsActivities.id))
    .where(
      and(
        eq(stepsActivities.userId, userId),
        eq(stepsActivities.okrId, krId),
        isNotNull(timeEntries.durationSeconds)
      )
    )
  return Number(result[0]?.total ?? 0)
}

/**
 * Cuenta las activities completadas vinculadas al KR dado.
 */
async function countCompletedActivitiesForKR(userId: string, krId: string): Promise<number> {
  const result = await db
    .select({ value: count() })
    .from(stepsActivities)
    .where(
      and(
        eq(stepsActivities.userId, userId),
        eq(stepsActivities.okrId, krId),
        eq(stepsActivities.status, 'completed')
      )
    )
  return result[0]?.value ?? 0
}

/**
 * Calcula el progreso (0-100) de un Key Result según su tipo.
 *
 * - time_based:    SUM(duration_seconds) / 3600 / targetValue * 100
 * - outcome_based: countCompleted / targetValue * 100
 * - milestone:     100 si existe ≥1 activity completada, 0 si no
 *
 * Siempre cap a 100 (Math.min).
 */
export async function calculateKRProgress(userId: string, krId: string): Promise<number> {
  assertDatabaseUrl()

  const kr = await db
    .select()
    .from(okrs)
    .where(and(eq(okrs.id, krId), eq(okrs.userId, userId), eq(okrs.type, 'key_result')))
    .limit(1)
    .then((rows) => rows[0] ?? null)

  if (!kr) return 0

  if (kr.krType === 'time_based') {
    if (!kr.targetValue || kr.targetValue <= 0) return 0
    const totalSeconds = await sumTimeEntriesForKR(userId, krId)
    const horasReales = totalSeconds / 3600
    return Math.min(100, Math.round((horasReales / kr.targetValue) * 100))
  }

  if (kr.krType === 'outcome_based') {
    if (!kr.targetValue || kr.targetValue <= 0) return 0
    const completedCount = await countCompletedActivitiesForKR(userId, krId)
    return Math.min(100, Math.round((completedCount / kr.targetValue) * 100))
  }

  if (kr.krType === 'milestone') {
    const completedCount = await countCompletedActivitiesForKR(userId, krId)
    return completedCount > 0 ? 100 : 0
  }

  return 0
}

/**
 * Calcula y persiste el progreso del KR en la tabla okrs.
 * Retorna el progreso calculado.
 */
export async function updateKRProgress(userId: string, krId: string): Promise<number> {
  assertDatabaseUrl()
  const progress = await calculateKRProgress(userId, krId)
  await db
    .update(okrs)
    .set({ progress, updatedAt: new Date() })
    .where(and(eq(okrs.id, krId), eq(okrs.userId, userId)))
  return progress
}

/**
 * Recalcula el progreso del OKR anual como promedio de sus KRs activos.
 * KRs sin tipo definido se excluyen del promedio.
 */
export async function updateAnnualOKRProgress(
  userId: string,
  annualOkrId: string
): Promise<number> {
  assertDatabaseUrl()

  const activeKRs = await db
    .select()
    .from(okrs)
    .where(
      and(
        eq(okrs.userId, userId),
        eq(okrs.parentId, annualOkrId),
        eq(okrs.type, 'key_result'),
        eq(okrs.status, 'active')
      )
    )

  if (activeKRs.length === 0) return 0

  const totalProgress = activeKRs.reduce((acc, kr) => acc + (kr.progress ?? 0), 0)
  const avgProgress = Math.round(totalProgress / activeKRs.length)

  await db
    .update(okrs)
    .set({ progress: avgProgress, updatedAt: new Date() })
    .where(and(eq(okrs.id, annualOkrId), eq(okrs.userId, userId)))

  return avgProgress
}
