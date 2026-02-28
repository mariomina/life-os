'use server'

// actions/habits.ts
// Server Actions for CRUD de Hábitos (AC2-AC5) +
// generateAndPersistOccurrences (AC7) +
// Emergent habit detection (AC9).

import { eq, and, gte, lte, ilike, count } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { habits } from '@/lib/db/schema/habits'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { areas } from '@/lib/db/schema/areas'
import { generateHabitOccurrences, isValidRrule } from '@/lib/habits/occurrence-utils'
import type { Habit } from '@/lib/db/schema/habits'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ActionResult {
  error: string | null
}

export interface CreateHabitData {
  title: string
  description?: string
  areaId: string
  rrule: string
  durationMinutes?: number
}

export interface UpdateHabitData {
  title?: string
  description?: string
  areaId?: string
  rrule?: string
  durationMinutes?: number
}

export interface ListHabitsResult {
  habits: (Habit & { areaName: string | null })[]
  error: string | null
}

export interface CreateActivityResult extends ActionResult {
  suggestHabit?: { title: string }
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

// ─── AC2 — Create Habit ───────────────────────────────────────────────────────

/**
 * Creates a new habit for the authenticated user.
 *
 * Validations:
 * - title required (non-empty)
 * - areaId required and must belong to the user
 * - rrule required and must be a valid RFC 5545 string
 *
 * After creating the habit, generates and persists occurrences up to now.
 */
export async function createHabit(data: CreateHabitData): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    if (!data.title.trim()) {
      return { error: 'El título es requerido' }
    }
    if (!data.areaId) {
      return { error: 'El área es requerida' }
    }
    if (!data.rrule || !isValidRrule(data.rrule)) {
      return { error: 'La frecuencia (rrule) no es válida' }
    }

    const userId = await getAuthenticatedUserId()

    // Verify area belongs to user
    const areaRows = await db
      .select({ id: areas.id })
      .from(areas)
      .where(and(eq(areas.id, data.areaId), eq(areas.userId, userId)))
      .limit(1)

    if (areaRows.length === 0) {
      return { error: 'El área seleccionada no existe' }
    }

    const [newHabit] = await db
      .insert(habits)
      .values({
        userId,
        areaId: data.areaId,
        title: data.title.trim(),
        description: data.description?.trim() ?? null,
        rrule: data.rrule,
        durationMinutes: data.durationMinutes ?? 30,
        isActive: true,
      })
      .returning()

    // AC7: Generate and persist occurrences from creation to now
    await generateAndPersistOccurrences(newHabit.id, new Date())

    revalidatePath('/habits')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── AC4 — Update Habit ───────────────────────────────────────────────────────

/**
 * Updates editable fields of a habit.
 * When rrule changes, future occurrences are recalculated on-the-fly;
 * already-persisted past occurrences are NOT retroactively modified.
 */
export async function updateHabit(id: string, data: UpdateHabitData): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    if (data.title !== undefined && !data.title.trim()) {
      return { error: 'El título no puede estar vacío' }
    }
    if (data.rrule !== undefined && !isValidRrule(data.rrule)) {
      return { error: 'La frecuencia (rrule) no es válida' }
    }
    if (data.areaId !== undefined) {
      const areaRows = await db
        .select({ id: areas.id })
        .from(areas)
        .where(and(eq(areas.id, data.areaId), eq(areas.userId, userId)))
        .limit(1)
      if (areaRows.length === 0) {
        return { error: 'El área seleccionada no existe' }
      }
    }

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }
    if (data.title !== undefined) updatePayload.title = data.title.trim()
    if (data.description !== undefined) updatePayload.description = data.description?.trim() ?? null
    if (data.areaId !== undefined) updatePayload.areaId = data.areaId
    if (data.rrule !== undefined) updatePayload.rrule = data.rrule
    if (data.durationMinutes !== undefined) updatePayload.durationMinutes = data.durationMinutes

    await db
      .update(habits)
      .set(updatePayload)
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))

    // AC7: If rrule changed, persist new occurrences up to now
    if (data.rrule !== undefined) {
      await generateAndPersistOccurrences(id, new Date())
    }

    revalidatePath('/habits')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── AC5 — Archive Habit (soft delete) ───────────────────────────────────────

/**
 * Sets is_active = false. Habit disappears from default list.
 * Linked occurrences in steps_activities are preserved.
 */
export async function archiveHabit(id: string): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    await db
      .update(habits)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(habits.id, id), eq(habits.userId, userId)))

    revalidatePath('/habits')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── AC5 — Hard Delete Habit ─────────────────────────────────────────────────

/**
 * Permanently deletes the habit record.
 * Linked occurrences in steps_activities have habit_id set to NULL (ON DELETE SET NULL).
 */
export async function deleteHabit(id: string): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    await db.delete(habits).where(and(eq(habits.id, id), eq(habits.userId, userId)))

    revalidatePath('/habits')
    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── AC3 — List Habits ────────────────────────────────────────────────────────

/**
 * Returns all habits for the authenticated user.
 * Pass includeInactive=true to include archived habits.
 */
export async function listHabits(includeInactive = false): Promise<ListHabitsResult> {
  assertDatabaseUrl()
  try {
    const userId = await getAuthenticatedUserId()

    const rows = await db
      .select({
        habit: habits,
        areaName: areas.name,
      })
      .from(habits)
      .leftJoin(areas, eq(habits.areaId, areas.id))
      .where(
        includeInactive
          ? eq(habits.userId, userId)
          : and(eq(habits.userId, userId), eq(habits.isActive, true))
      )
      .orderBy(habits.isActive, habits.createdAt)

    return {
      habits: rows.map((r) => ({ ...r.habit, areaName: r.areaName ?? null })),
      error: null,
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { habits: [], error: 'No autenticado' }
    return { habits: [], error: message }
  }
}

// ─── AC7 — Generate and Persist Occurrences ───────────────────────────────────

/**
 * Generates and persists past/present habit occurrences up to windowEnd.
 *
 * Algorithm:
 * 1. Load habit from DB
 * 2. Calculate occurrences from habit.createdAt to windowEnd using generateHabitOccurrences
 * 3. Filter to only occurrences <= now (future ones calculated on-the-fly)
 * 4. Deduplicate against existing steps_activities rows (by habitId + scheduledAt)
 * 5. Insert only new occurrences
 *
 * @param habitId  - UUID of the habit
 * @param windowEnd - Upper bound for occurrence generation (usually new Date())
 */
export async function generateAndPersistOccurrences(
  habitId: string,
  windowEnd: Date
): Promise<ActionResult> {
  assertDatabaseUrl()
  try {
    // 1. Load habit
    const habitRows = await db.select().from(habits).where(eq(habits.id, habitId)).limit(1)

    if (habitRows.length === 0) {
      return { error: 'Hábito no encontrado' }
    }

    const habit = habitRows[0]
    const windowStart = habit.createdAt
    const now = new Date()
    const effectiveEnd = windowEnd < now ? windowEnd : now

    // 2. Generate occurrences in [createdAt, effectiveEnd]
    const occurrences = generateHabitOccurrences({ rrule: habit.rrule }, windowStart, effectiveEnd)

    if (occurrences.length === 0) {
      return { error: null }
    }

    // 3. Load existing occurrences to deduplicate
    const existing = await db
      .select({ scheduledAt: stepsActivities.scheduledAt })
      .from(stepsActivities)
      .where(
        and(
          eq(stepsActivities.habitId, habitId),
          gte(stepsActivities.scheduledAt, windowStart),
          lte(stepsActivities.scheduledAt, effectiveEnd)
        )
      )

    const existingTimes = new Set(
      existing.filter((r) => r.scheduledAt !== null).map((r) => r.scheduledAt!.getTime())
    )

    // 4. Filter out duplicates
    const toInsert = occurrences.filter((d) => !existingTimes.has(d.getTime()))

    if (toInsert.length === 0) {
      return { error: null }
    }

    // 5. Insert new occurrences
    await db.insert(stepsActivities).values(
      toInsert.map((d) => ({
        habitId,
        userId: habit.userId,
        areaId: habit.areaId,
        title: habit.title,
        description: habit.description,
        executorType: 'human' as const,
        planned: true,
        status: 'pending' as const,
        scheduledAt: d,
        scheduledDurationMinutes: habit.durationMinutes,
      }))
    )

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    return { error: message }
  }
}

// ─── AC9 — Create Spontaneous Activity + Emergent Habit Detection ─────────────

/**
 * Creates a spontaneous (unplanned) activity for the user.
 * After creation, checks if the same title appears 3+ times in the last 14 days.
 * If so, returns suggestHabit: { title } to trigger the emergent habit banner.
 */
export async function createSpontaneousActivity(data: {
  title: string
  description?: string
  areaId: string
  durationMinutes?: number
}): Promise<CreateActivityResult> {
  assertDatabaseUrl()
  try {
    if (!data.title.trim()) {
      return { error: 'El título es requerido' }
    }
    if (!data.areaId) {
      return { error: 'El área es requerida' }
    }

    const userId = await getAuthenticatedUserId()

    await db.insert(stepsActivities).values({
      userId,
      areaId: data.areaId,
      title: data.title.trim(),
      description: data.description?.trim() ?? null,
      executorType: 'human',
      planned: false,
      status: 'pending',
      scheduledDurationMinutes: data.durationMinutes ?? null,
    })

    // AC9: Check for emergent habit pattern (3+ spontaneous in last 14 days)
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000)
    const recentResult = await db
      .select({ count: count() })
      .from(stepsActivities)
      .where(
        and(
          eq(stepsActivities.userId, userId),
          eq(stepsActivities.planned, false),
          ilike(stepsActivities.title, data.title.trim()),
          gte(stepsActivities.createdAt, cutoff)
        )
      )

    const recentCount = recentResult[0]?.count ?? 0

    revalidatePath('/')
    if (recentCount >= 3) {
      return { error: null, suggestHabit: { title: data.title.trim() } }
    }

    return { error: null }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Error desconocido'
    if (message === 'UNAUTHENTICATED') return { error: 'No autenticado' }
    return { error: message }
  }
}

// ─── Story 8.5: Unconscious Habit Detection ───────────────────────────────────

import { detectUnconsciousHabits } from '@/features/habits/unconscious-detection'
export type { UnconsciousHabitSuggestion } from '@/features/habits/unconscious-detection'

/**
 * Detects unconscious habits from the user's activities in the last 90 days.
 */
export async function detectUnconsciousHabitsFromActivities() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('UNAUTHENTICATED')

  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const [activitiesResult, habitsResult] = await Promise.all([
    db
      .select({ title: stepsActivities.title, scheduledAt: stepsActivities.scheduledAt })
      .from(stepsActivities)
      .where(
        and(eq(stepsActivities.userId, user.id), gte(stepsActivities.scheduledAt, ninetyDaysAgo))
      ),
    db
      .select({ title: habits.title })
      .from(habits)
      .where(and(eq(habits.userId, user.id), eq(habits.isActive, true))),
  ])

  return detectUnconsciousHabits(
    activitiesResult,
    habitsResult.map((h) => h.title)
  )
}

/**
 * Creates a habit from a detected unconscious pattern.
 */
export async function createHabitFromPattern(
  term: string,
  areaId?: string
): Promise<{ success: boolean; habitId?: string; error?: string }> {
  try {
    const supabase = await createSupabaseServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return { success: false, error: 'UNAUTHENTICATED' }

    const [newHabit] = await db
      .insert(habits)
      .values({
        userId: user.id,
        areaId: areaId ?? null,
        title: term.charAt(0).toUpperCase() + term.slice(1),
        rrule: 'FREQ=WEEKLY',
        durationMinutes: 30,
      })
      .returning({ id: habits.id })

    revalidatePath('/habits')
    return { success: true, habitId: newHabit.id }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
  }
}

/**
 * Dismisses a habit suggestion (client-side localStorage — no DB persistence in MVP).
 * This is a no-op server action; dismissal is handled client-side.
 */
export async function dismissUnconsciousHabit(_term: string): Promise<{ success: boolean }> {
  return { success: true }
}
