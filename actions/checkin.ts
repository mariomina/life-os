'use server'

// actions/checkin.ts
// Server Actions for Daily Check-in accountability.
// Handles confirming individual activities and bulk confirming habits.

import { eq, and } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { checkinResponses } from '@/lib/db/schema/checkin-responses'
import { habits } from '@/lib/db/schema/habits'
import { calculateStreak } from '@/lib/habits/streak-utils'
import { recalculateSubareaScore, recalculateAreaScore } from '@/lib/scoring/area-calculator'
import { areaSubareaScores } from '@/lib/db/schema/area-subarea-scores'
import { areaSubareas } from '@/lib/db/schema/area-subareas'
import { normalizeScore } from '@/lib/areas/checkin-scheduler'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult {
  error: string | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

/** Returns YYYY-MM-DD string for yesterday in UTC */
function getYesterdayStr(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

/** Returns today at UTC midnight as a Date (for postponed rescheduling) */
function getTodayUTCMidnight(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Recalculates streak metrics for a habit after a check-in.
 * Loads all completed checkin_responses for the habit, then calls calculateStreak.
 *
 * - completed: increment streak, update lastCompletedAt
 * - skipped:   reset streakCurrent to 0, preserve streakBest
 * - postponed: no streak change
 */
async function recalculateHabitStreak(
  habitId: string,
  userId: string,
  checkinStatus: 'completed' | 'skipped' | 'postponed',
  checkinDate: string
): Promise<void> {
  if (checkinStatus === 'postponed') return

  // Load the habit to get rrule and current streakBest
  const habitRows = await db
    .select()
    .from(habits)
    .where(and(eq(habits.id, habitId), eq(habits.userId, userId)))
    .limit(1)

  if (habitRows.length === 0) return
  const habit = habitRows[0]

  if (checkinStatus === 'skipped') {
    await db
      .update(habits)
      .set({ streakCurrent: 0, updatedAt: new Date() })
      .where(eq(habits.id, habitId))
    return
  }

  // completed: recalculate from all completed checkin_responses for this habit
  const completedResponses = await db
    .select({ checkinDate: checkinResponses.checkinDate })
    .from(checkinResponses)
    .innerJoin(stepsActivities, eq(checkinResponses.stepActivityId, stepsActivities.id))
    .where(
      and(
        eq(stepsActivities.habitId, habitId),
        eq(stepsActivities.userId, userId),
        eq(checkinResponses.status, 'completed')
      )
    )

  const completionDates = completedResponses.map((r) => new Date(r.checkinDate))
  const { current, best } = calculateStreak(completionDates, habit.rrule)

  await db
    .update(habits)
    .set({
      streakCurrent: current,
      streakBest: Math.max(best, habit.streakBest),
      lastCompletedAt: checkinDate,
      updatedAt: new Date(),
    })
    .where(eq(habits.id, habitId))
}

// ─── AC7 — confirmActivity ────────────────────────────────────────────────────

/**
 * Confirms a single activity with the given status.
 *
 * Flow:
 * 1. Verify ownership (userId in steps_activities)
 * 2. Upsert checkin_responses (stepActivityId + checkinDate = yesterday)
 * 3. Update steps_activities.status
 *    - completed  → 'completed', completedAt = now
 *    - skipped    → 'skipped'
 *    - postponed  → status stays 'pending', scheduledAt = today UTC midnight
 * 4. If habitId exists, recalculate streak
 * 5. revalidatePath('/')
 */
export async function confirmActivity(
  activityId: string,
  status: 'completed' | 'skipped' | 'postponed'
): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()
    const checkinDate = getYesterdayStr()

    // 1. Verify ownership + load habitId, subareaId, areaId
    const activityRows = await db
      .select({
        id: stepsActivities.id,
        userId: stepsActivities.userId,
        habitId: stepsActivities.habitId,
        subareaId: stepsActivities.subareaId,
        areaId: stepsActivities.areaId,
      })
      .from(stepsActivities)
      .where(and(eq(stepsActivities.id, activityId), eq(stepsActivities.userId, userId)))
      .limit(1)

    if (activityRows.length === 0) {
      return { error: 'Actividad no encontrada' }
    }

    const activity = activityRows[0]

    // 2. Upsert checkin_responses
    await db
      .insert(checkinResponses)
      .values({
        userId,
        stepActivityId: activityId,
        checkinDate,
        status,
      })
      .onConflictDoUpdate({
        target: [checkinResponses.stepActivityId, checkinResponses.checkinDate],
        set: { status, userId },
      })

    // 3. Update steps_activities
    if (status === 'completed') {
      await db
        .update(stepsActivities)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(stepsActivities.id, activityId))
    } else if (status === 'skipped') {
      await db
        .update(stepsActivities)
        .set({ status: 'skipped', updatedAt: new Date() })
        .where(eq(stepsActivities.id, activityId))
    } else {
      // postponed: reschedule to today
      await db
        .update(stepsActivities)
        .set({ scheduledAt: getTodayUTCMidnight(), updatedAt: new Date() })
        .where(eq(stepsActivities.id, activityId))
    }

    // 4. Recalculate streak if this is a habit occurrence
    if (activity.habitId) {
      await recalculateHabitStreak(activity.habitId, userId, status, checkinDate)
    }

    // Story 11.4 — Trigger: recalcular score de sub-área al completar actividad
    if (status === 'completed' && activity.subareaId && activity.areaId) {
      await recalculateSubareaScore(activity.subareaId, userId, new Date())
      await recalculateAreaScore(activity.areaId, userId)
    }

    revalidatePath('/')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── AC4 — bulkConfirmHabits ──────────────────────────────────────────────────

/**
 * Confirms multiple habit activities at once, all as 'completed'.
 * Recalculates streaks for each unique habit in parallel.
 *
 * Only processes activities that belong to the authenticated user.
 */
export async function bulkConfirmHabits(activityIds: string[]): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    if (activityIds.length === 0) return { error: null }

    const userId = await getAuthenticatedUserId()
    const checkinDate = getYesterdayStr()

    // Load and verify ownership of all activities
    const activityRows = await db
      .select({
        id: stepsActivities.id,
        habitId: stepsActivities.habitId,
        subareaId: stepsActivities.subareaId,
        areaId: stepsActivities.areaId,
      })
      .from(stepsActivities)
      .where(eq(stepsActivities.userId, userId))

    const ownedIds = new Set(activityRows.map((r) => r.id))
    const habitIdMap = new Map(activityRows.map((r) => [r.id, r.habitId]))
    const subareaMap = new Map(
      activityRows.map((r) => [r.id, { subareaId: r.subareaId, areaId: r.areaId }])
    )

    const validIds = activityIds.filter((id) => ownedIds.has(id))
    if (validIds.length === 0) return { error: 'No se encontraron actividades válidas' }

    // Upsert checkin_responses for each activity
    await db
      .insert(checkinResponses)
      .values(
        validIds.map((id) => ({
          userId,
          stepActivityId: id,
          checkinDate,
          status: 'completed' as const,
        }))
      )
      .onConflictDoUpdate({
        target: [checkinResponses.stepActivityId, checkinResponses.checkinDate],
        set: { status: 'completed', userId },
      })

    // Update steps_activities.status for all valid ids
    for (const id of validIds) {
      await db
        .update(stepsActivities)
        .set({ status: 'completed', completedAt: new Date(), updatedAt: new Date() })
        .where(eq(stepsActivities.id, id))
    }

    // Recalculate streaks for each unique habit
    const uniqueHabitIds = new Set(
      validIds.map((id) => habitIdMap.get(id)).filter((hId): hId is string => hId != null)
    )

    await Promise.all(
      Array.from(uniqueHabitIds).map((habitId) =>
        recalculateHabitStreak(habitId, userId, 'completed', checkinDate)
      )
    )

    // Story 11.4 — Trigger: recalcular score de sub-áreas únicas afectadas
    const uniqueSubareas = new Map<string, string>() // subareaId → areaId
    for (const id of validIds) {
      const info = subareaMap.get(id)
      if (info?.subareaId && info.areaId) {
        uniqueSubareas.set(info.subareaId, info.areaId)
      }
    }
    await Promise.all(
      Array.from(uniqueSubareas.entries()).map(([subareaId, areaId]) =>
        recalculateSubareaScore(subareaId, userId, new Date()).then(() =>
          recalculateAreaScore(areaId, userId)
        )
      )
    )

    revalidatePath('/')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── Story 11.5 — submitSubareaCheckin ────────────────────────────────────────

/**
 * Persists a subjective checkin score for a sub-area.
 *
 * Flow:
 * 1. Validate score is in [1, 10] range
 * 2. Verify the subarea belongs to the authenticated user
 * 3. Normalize score 1-10 → 0-100
 * 4. UPSERT area_subarea_scores.subjectiveScore for today's date
 * 5. Trigger recalculateSubareaScore to update the composite score
 * 6. Revalidate /areas
 */
export async function submitSubareaCheckin(
  subareaId: string,
  score: number,
  date: Date
): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    if (score < 1 || score > 10) {
      return { error: 'El score debe estar entre 1 y 10' }
    }

    const userId = await getAuthenticatedUserId()

    // Verify ownership
    const subareaRows = await db
      .select({ id: areaSubareas.id, areaId: areaSubareas.areaId })
      .from(areaSubareas)
      .where(and(eq(areaSubareas.id, subareaId), eq(areaSubareas.userId, userId)))
      .limit(1)

    if (subareaRows.length === 0) {
      return { error: 'Sub-área no encontrada' }
    }

    const subjectiveScore = normalizeScore(score)
    const scoredAt = date.toISOString().slice(0, 10) // YYYY-MM-DD

    // UPSERT — update subjectiveScore for this day; preserve other components
    await db
      .insert(areaSubareaScores)
      .values({
        subareaId,
        userId,
        score: subjectiveScore,
        subjectiveScore,
        scoredAt,
      })
      .onConflictDoUpdate({
        target: [areaSubareaScores.subareaId, areaSubareaScores.scoredAt],
        set: { subjectiveScore, userId },
      })

    // Trigger recalculation to recompute composite score with new subjectiveScore
    await recalculateSubareaScore(subareaId, userId, date)

    revalidatePath('/areas')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}
