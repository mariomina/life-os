// lib/db/queries/habits.ts
// Read queries for the habits table.
// All functions require explicit userId — do not rely on RLS alone.

import { eq, and, desc, count } from 'drizzle-orm'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { habits } from '@/lib/db/schema/habits'
import { areas } from '@/lib/db/schema/areas'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import type { Habit } from '@/lib/db/schema/habits'
import type { Area } from '@/lib/db/schema/areas'

export interface HabitWithArea extends Habit {
  area: Area | null
}

/**
 * Returns all habits for the user.
 * By default only active habits (is_active = true).
 * Pass includeInactive=true to include archived habits.
 *
 * Order: active first, then by created_at descending.
 */
export async function getHabits(userId: string, includeInactive = false): Promise<HabitWithArea[]> {
  assertDatabaseUrl()

  const rows = await db
    .select({ habit: habits, area: areas })
    .from(habits)
    .leftJoin(areas, eq(habits.areaId, areas.id))
    .where(
      includeInactive
        ? eq(habits.userId, userId)
        : and(eq(habits.userId, userId), eq(habits.isActive, true))
    )
    .orderBy(desc(habits.isActive), desc(habits.createdAt))

  return rows.map((row) => ({ ...row.habit, area: row.area ?? null }))
}

/**
 * Returns a single habit by ID, verifying ownership.
 */
export async function getHabitById(userId: string, id: string): Promise<HabitWithArea | null> {
  assertDatabaseUrl()

  const rows = await db
    .select({ habit: habits, area: areas })
    .from(habits)
    .leftJoin(areas, eq(habits.areaId, areas.id))
    .where(and(eq(habits.id, id), eq(habits.userId, userId)))
    .limit(1)

  if (rows.length === 0) return null
  return { ...rows[0].habit, area: rows[0].area ?? null }
}

/**
 * Counts how many steps_activities entries are linked to this habit.
 * Used to show the user before a hard delete how many occurrences will lose their link.
 */
export async function countLinkedOccurrences(habitId: string): Promise<number> {
  assertDatabaseUrl()

  const result = await db
    .select({ count: count() })
    .from(stepsActivities)
    .where(eq(stepsActivities.habitId, habitId))

  return result[0]?.count ?? 0
}
