'use server'

// actions/timer.ts
// Server Actions para time tracking de actividades en el Calendario.
// Start / Stop / Pause / Resume de entradas en time_entries.
// Story 5.8 — Time Tracking Start/Stop Explícito, Pausas con Razón, Duración Automática.

import { eq, and, isNotNull, inArray, sum, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { timeEntries } from '@/lib/db/schema/time-entries'
import { stepSkillTags } from '@/lib/db/schema/step-skill-tags'
import { skills } from '@/lib/db/schema/skills'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TimerActionResult {
  error: string | null
  entryId?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function getAuthenticatedUserId(): Promise<string> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')
  return user.id
}

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Starts a timer for an activity. Inserts a new time_entries row with isActive=true.
 * Returns error if a timer is already active for this activity.
 */
export async function startTimer(activityId: string): Promise<TimerActionResult> {
  if (!activityId || !UUID_REGEX.test(activityId)) return { error: 'ID de actividad inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    // Guard: no active timer already running for this activity
    const existing = await db
      .select({ id: timeEntries.id })
      .from(timeEntries)
      .where(and(eq(timeEntries.stepActivityId, activityId), eq(timeEntries.isActive, true)))
      .limit(1)

    if (existing.length > 0) return { error: 'Ya hay un timer activo para esta actividad' }

    const [entry] = await db
      .insert(timeEntries)
      .values({
        stepActivityId: activityId,
        userId,
        startedAt: new Date(),
        isActive: true,
      })
      .returning({ id: timeEntries.id })

    revalidatePath('/calendar')
    return { error: null, entryId: entry.id }
  } catch (err) {
    console.error('[startTimer] failed:', err)
    return { error: 'No se pudo iniciar el timer. Inténtalo de nuevo.' }
  }
}

/**
 * Stops an active timer. Calculates durationSeconds server-side and sets isActive=false.
 */
export async function stopTimer(entryId: string): Promise<TimerActionResult> {
  if (!entryId || !UUID_REGEX.test(entryId)) return { error: 'ID de entrada inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const [entry] = await db
      .select()
      .from(timeEntries)
      .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)))
      .limit(1)

    if (!entry) return { error: 'Entrada de timer no encontrada' }

    const now = new Date()
    const durationSeconds = Math.round((now.getTime() - entry.startedAt.getTime()) / 1000)

    await db
      .update(timeEntries)
      .set({ endedAt: now, durationSeconds, isActive: false, updatedAt: now })
      .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)))

    // Story 7.2 — AC5: Propagate time to skills tagged to this activity
    const tags = await db
      .select({ skillId: stepSkillTags.skillId })
      .from(stepSkillTags)
      .where(eq(stepSkillTags.stepActivityId, entry.stepActivityId))

    if (tags.length > 0) {
      await db
        .update(skills)
        .set({
          timeInvestedSeconds: sql`${skills.timeInvestedSeconds} + ${durationSeconds}`,
          updatedAt: new Date(),
        })
        .where(
          and(
            inArray(
              skills.id,
              tags.map((t) => t.skillId)
            ),
            eq(skills.userId, userId)
          )
        )
    }

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[stopTimer] failed:', err)
    return { error: 'No se pudo detener el timer.' }
  }
}

/**
 * Pauses an active timer. Records pausedAt, pauseReason, and sets isActive=false.
 * The reason is required (trimmed, max 200 chars).
 */
export async function pauseTimer(entryId: string, reason: string): Promise<TimerActionResult> {
  if (!entryId || !UUID_REGEX.test(entryId)) return { error: 'ID de entrada inválido' }

  const trimmedReason = reason.trim()
  if (!trimmedReason) return { error: 'La razón de la pausa es requerida' }
  if (trimmedReason.length > 200) return { error: 'La razón no puede superar 200 caracteres' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()
    const now = new Date()

    await db
      .update(timeEntries)
      .set({ pausedAt: now, pauseReason: trimmedReason, isActive: false, updatedAt: now })
      .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)))

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[pauseTimer] failed:', err)
    return { error: 'No se pudo pausar el timer.' }
  }
}

/**
 * Resumes a paused timer by inserting a NEW time_entries row (new session).
 * The paused row keeps its pausedAt/pauseReason for historical record.
 */
export async function resumeTimer(entryId: string): Promise<TimerActionResult> {
  if (!entryId || !UUID_REGEX.test(entryId)) return { error: 'ID de entrada inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const [paused] = await db
      .select({ stepActivityId: timeEntries.stepActivityId })
      .from(timeEntries)
      .where(and(eq(timeEntries.id, entryId), eq(timeEntries.userId, userId)))
      .limit(1)

    if (!paused) return { error: 'Entrada de timer no encontrada' }

    // New session — insert a fresh row (paused row stays for history)
    const [newEntry] = await db
      .insert(timeEntries)
      .values({
        stepActivityId: paused.stepActivityId,
        userId,
        startedAt: new Date(),
        isActive: true,
      })
      .returning({ id: timeEntries.id })

    revalidatePath('/calendar')
    return { error: null, entryId: newEntry.id }
  } catch (err) {
    console.error('[resumeTimer] failed:', err)
    return { error: 'No se pudo reanudar el timer.' }
  }
}

/**
 * Returns total accumulated seconds per activity.
 * Only sums rows with durationSeconds IS NOT NULL (completed sessions).
 * Ignores the currently-active row (no endedAt yet).
 */
export async function getTimeTotalsForActivities(
  userId: string,
  activityIds: string[]
): Promise<Record<string, number>> {
  if (activityIds.length === 0) return {}

  try {
    assertDatabaseUrl()
    const rows = await db
      .select({
        stepActivityId: timeEntries.stepActivityId,
        total: sum(timeEntries.durationSeconds),
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          inArray(timeEntries.stepActivityId, activityIds),
          isNotNull(timeEntries.durationSeconds)
        )
      )
      .groupBy(timeEntries.stepActivityId)

    return Object.fromEntries(rows.map((r) => [r.stepActivityId, Number(r.total ?? 0)]))
  } catch (err) {
    console.error('[getTimeTotalsForActivities] failed:', err)
    return {}
  }
}

/**
 * Returns the active time entry (isActive=true) per activity, if any.
 * Used to restore timer state after page reload.
 */
export async function getActiveTimersForActivities(
  userId: string,
  activityIds: string[]
): Promise<Record<string, string>> {
  if (activityIds.length === 0) return {}

  try {
    assertDatabaseUrl()
    const rows = await db
      .select({ id: timeEntries.id, stepActivityId: timeEntries.stepActivityId })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          inArray(timeEntries.stepActivityId, activityIds),
          eq(timeEntries.isActive, true)
        )
      )

    return Object.fromEntries(rows.map((r) => [r.stepActivityId, r.id]))
  } catch (err) {
    console.error('[getActiveTimersForActivities] failed:', err)
    return {}
  }
}

/**
 * Returns the startedAt ISO timestamp for each active timer entry.
 * Used on page load to seed the live clock without waiting for a Realtime event.
 * Story 5.9 — Supabase Realtime para timer activo.
 */
export async function getActiveTimerStartTimes(
  userId: string,
  activityIds: string[]
): Promise<Record<string, string>> {
  if (activityIds.length === 0) return {}

  try {
    assertDatabaseUrl()
    const rows = await db
      .select({
        stepActivityId: timeEntries.stepActivityId,
        startedAt: timeEntries.startedAt,
      })
      .from(timeEntries)
      .where(
        and(
          eq(timeEntries.userId, userId),
          inArray(timeEntries.stepActivityId, activityIds),
          eq(timeEntries.isActive, true)
        )
      )

    return Object.fromEntries(rows.map((r) => [r.stepActivityId, r.startedAt.toISOString()]))
  } catch (err) {
    console.error('[getActiveTimerStartTimes] failed:', err)
    return {}
  }
}
