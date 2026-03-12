// lib/scoring/area-calculator.ts
// Capa de orquestación: coordina DB + motor puro para recalcular scores.
// Story 11.3 — Motor de Cálculo.
// [Source: docs/briefs/areas-redesign-brief.md#3-arquitectura, #5-fuentes]

import { eq, and, gte, isNotNull, sql } from 'drizzle-orm'
import { format } from 'date-fns'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { areaSubareas } from '@/lib/db/schema/area-subareas'
import { areaSubareaScores } from '@/lib/db/schema/area-subarea-scores'
import { areaScores } from '@/lib/db/schema/area-scores'
import { areas } from '@/lib/db/schema/areas'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { timeEntries } from '@/lib/db/schema/time-entries'
import { okrs } from '@/lib/db/schema/okrs'
import {
  calculateBehavioralScore,
  calculateSubareaScore,
  applyDecay,
  type BehavioralSignals,
} from '@/features/maslow/subarea-scoring'
import {
  calculateAreaScoreFromSubareas,
  calculateGlobalScore,
  calculateAreaScore,
} from '@/features/maslow/scoring'
import type { MaslowLevel } from '@/lib/utils/maslow-weights'

/**
 * Ventanas de tiempo en días por nivel Maslow.
 * Determina qué período de actividad se considera para el cálculo conductual.
 * [Source: brief#3-arquitectura + brief#6-reglas]
 */
const TIME_WINDOWS_DAYS: Record<number, number> = {
  1: 7, // L1 Fisiológicas: rolling 7 días
  2: 30, // L2 Seguridad: rolling 30 días
  3: 30, // L3 Pertenencia: rolling 30 días
  4: 90, // L4 Estima: rolling 90 días (trimestral)
  5: 90,
  6: 90,
  7: 90,
  8: 90,
}

/**
 * Recalcula el score compuesto de una sub-área específica.
 *
 * Flujo:
 * 1. Determina ventana de tiempo por nivel Maslow
 * 2. Consulta señales conductuales en la ventana (solo hechos, no intenciones)
 * 3. Lee último score subjetivo disponible (del checkin más reciente)
 * 4. Lee progreso del OKR del área padre si existe
 * 5. Calcula behavioral + composite con el motor puro
 * 6. UPSERT en area_subarea_scores (una entrada por día)
 * 7. Actualiza area_subareas.currentScore y scoreUpdatedAt
 *
 * @param subareaId - UUID de la sub-área a recalcular
 * @param userId - UUID del usuario (RLS)
 * @param date - Fecha base del cálculo (default: hoy)
 * @returns Score calculado 0-100
 * [Source: brief#5-fuentes — "Hechos, no aspiraciones"]
 */
export async function recalculateSubareaScore(
  subareaId: string,
  userId: string,
  date: Date = new Date()
): Promise<number> {
  assertDatabaseUrl()

  // 1. Cargar sub-área
  const [subarea] = await db
    .select()
    .from(areaSubareas)
    .where(and(eq(areaSubareas.id, subareaId), eq(areaSubareas.userId, userId)))
    .limit(1)

  if (!subarea) return 0

  const level = subarea.maslowLevel as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8
  const windowDays = TIME_WINDOWS_DAYS[level] ?? 30
  const windowStart = new Date(date)
  windowStart.setDate(windowStart.getDate() - windowDays)

  // 2. Señales conductuales: actividades completadas vinculadas a la sub-área
  const activitySignals = await db
    .select({
      completedActivities: sql<number>`count(*)::int`,
    })
    .from(stepsActivities)
    .where(
      and(
        eq(stepsActivities.subareaId, subareaId),
        eq(stepsActivities.userId, userId),
        eq(stepsActivities.status, 'completed'),
        gte(stepsActivities.completedAt, windowStart)
      )
    )

  const completedActivities = activitySignals[0]?.completedActivities ?? 0

  // 2b. Tiempo total de time_entries completados (endedAt IS NOT NULL) en la ventana
  const timeSignals = await db
    .select({
      totalTimeSeconds: sql<number>`coalesce(sum(te.duration_seconds), 0)::int`,
    })
    .from(timeEntries)
    .innerJoin(stepsActivities, eq(timeEntries.stepActivityId, stepsActivities.id))
    .where(
      and(
        eq(stepsActivities.subareaId, subareaId),
        eq(timeEntries.userId, userId),
        isNotNull(timeEntries.endedAt),
        gte(timeEntries.startedAt, windowStart)
      )
    )

  const totalTimeSeconds = timeSignals[0]?.totalTimeSeconds ?? 0

  // 2c. Días con hábito completado: días distintos con steps_activities vinculados a hábito
  const habitSignals = await db
    .select({
      completedHabitDays: sql<number>`count(distinct date_trunc('day', completed_at))::int`,
    })
    .from(stepsActivities)
    .where(
      and(
        eq(stepsActivities.subareaId, subareaId),
        eq(stepsActivities.userId, userId),
        eq(stepsActivities.status, 'completed'),
        isNotNull(stepsActivities.habitId),
        gte(stepsActivities.completedAt, windowStart)
      )
    )

  const completedHabitDays = habitSignals[0]?.completedHabitDays ?? 0

  // 3. Último score subjetivo disponible del historial (del checkin más reciente)
  const [lastScore] = await db
    .select({ subjectiveScore: areaSubareaScores.subjectiveScore })
    .from(areaSubareaScores)
    .where(and(eq(areaSubareaScores.subareaId, subareaId), eq(areaSubareaScores.userId, userId)))
    .orderBy(sql`scored_at desc`)
    .limit(1)

  const subjectiveScore = lastScore?.subjectiveScore ?? 0

  // 4. Progreso del OKR activo del área padre (key_result con progress)
  const [okrData] = await db
    .select({ progress: okrs.progress })
    .from(okrs)
    .where(
      and(
        eq(okrs.areaId, subarea.areaId),
        eq(okrs.userId, userId),
        eq(okrs.type, 'key_result'),
        eq(okrs.status, 'active')
      )
    )
    .orderBy(sql`progress desc`)
    .limit(1)

  const krProgress = okrData?.progress ?? -1

  // 5. Calcular behavioral + composite con motor puro
  const signals: BehavioralSignals = {
    subareaSlug: subarea.slug,
    maslowLevel: level,
    completedHabitDays,
    totalDaysInWindow: windowDays,
    completedActivities,
    totalTimeSeconds,
    completedKRProgress: krProgress,
  }

  const behavioral = calculateBehavioralScore(signals)
  const progressScore = krProgress >= 0 ? krProgress : 0
  const composite = calculateSubareaScore(behavioral, subjectiveScore ?? 0, progressScore, level)

  // 6. UPSERT en area_subarea_scores (una entrada por (subareaId, scoredAt))
  const today = format(date, 'yyyy-MM-dd')
  await db
    .insert(areaSubareaScores)
    .values({
      subareaId,
      userId,
      score: composite,
      behavioralScore: behavioral,
      subjectiveScore: subjectiveScore ?? 0,
      progressScore,
      scoredAt: today,
    })
    .onConflictDoUpdate({
      target: [areaSubareaScores.subareaId, areaSubareaScores.scoredAt],
      set: {
        score: composite,
        behavioralScore: behavioral,
        progressScore,
      },
    })

  // 7. Actualizar area_subareas.currentScore y scoreUpdatedAt
  await db
    .update(areaSubareas)
    .set({ currentScore: composite, scoreUpdatedAt: date })
    .where(eq(areaSubareas.id, subareaId))

  return composite
}

/**
 * Recalcula el score de un área completa como promedio ponderado de sus sub-áreas.
 *
 * Para sub-áreas con scoreUpdatedAt > 24h (o nulo), llama recalculateSubareaScore.
 * Para sub-áreas actualizadas en las últimas 24h, usa el currentScore cacheado.
 *
 * @param areaId - UUID del área a recalcular
 * @param userId - UUID del usuario (RLS)
 * @returns Score del área 0-100
 */
export async function recalculateAreaScore(areaId: string, userId: string): Promise<number> {
  assertDatabaseUrl()

  const subareasData = await db
    .select()
    .from(areaSubareas)
    .where(
      and(
        eq(areaSubareas.areaId, areaId),
        eq(areaSubareas.userId, userId),
        eq(areaSubareas.isActive, true)
      )
    )

  if (subareasData.length === 0) return 0

  const now = new Date()
  const staleThreshold = 24 * 60 * 60 * 1000 // 24 horas en ms

  // Recalcular sub-áreas desactualizadas (> 24h o nunca calculadas)
  const scores = await Promise.all(
    subareasData.map(async (subarea) => {
      const isStale =
        !subarea.scoreUpdatedAt ||
        now.getTime() - new Date(subarea.scoreUpdatedAt).getTime() > staleThreshold

      const currentScore = isStale
        ? await recalculateSubareaScore(subarea.id, userId, now)
        : subarea.currentScore

      return { currentScore, internalWeight: Number(subarea.internalWeight) }
    })
  )

  const areaScore = calculateAreaScoreFromSubareas(scores)
  const rounded = Math.max(0, Math.min(100, Math.round(areaScore)))

  // Obtener maslowLevel del área para el snapshot
  const [areaData] = await db
    .select({ maslowLevel: areas.maslowLevel })
    .from(areas)
    .where(eq(areas.id, areaId))
    .limit(1)

  // Actualizar areas.currentScore y scoreUpdatedAt
  await db
    .update(areas)
    .set({ currentScore: rounded, scoreUpdatedAt: now })
    .where(eq(areas.id, areaId))

  // Insertar snapshot en area_scores (UPSERT por día)
  if (areaData) {
    const today = format(now, 'yyyy-MM-dd')
    await db
      .insert(areaScores)
      .values({ areaId, userId, score: rounded, scoredAt: today })
      .onConflictDoUpdate({
        target: [areaScores.areaId, areaScores.scoredAt],
        set: { score: rounded },
      })
  }

  return rounded
}

/**
 * Recalcula el GLSHS (Global Life System Health Score) del usuario.
 * Orquesta el recálculo de las 8 áreas y usa calculateGlobalScore existente.
 *
 * @param userId - UUID del usuario
 * @returns GLSHS global 0-100
 */
export async function recalculateGlobalScore(userId: string): Promise<number> {
  assertDatabaseUrl()

  const userAreas = await db
    .select({ id: areas.id, maslowLevel: areas.maslowLevel })
    .from(areas)
    .where(eq(areas.userId, userId))

  if (userAreas.length === 0) return 0

  // Recalcular todas las áreas en paralelo
  const areaResults = await Promise.all(
    userAreas.map(async (area) => ({
      level: area.maslowLevel as MaslowLevel,
      score: await recalculateAreaScore(area.id, userId),
    }))
  )

  // Construir el mapa nivel → score para calculateGlobalScore
  const areaScoresMap = Object.fromEntries(
    areaResults.map(({ level, score }) => [level, score])
  ) as Record<MaslowLevel, number>

  // Asegurar que los 8 niveles estén presentes (default 0)
  const allLevels = [1, 2, 3, 4, 5, 6, 7, 8] as MaslowLevel[]
  for (const level of allLevels) {
    if (!(level in areaScoresMap)) areaScoresMap[level] = 0
  }

  const global = calculateGlobalScore(areaScoresMap)
  return Math.max(0, Math.min(100, Math.round(global)))
}
