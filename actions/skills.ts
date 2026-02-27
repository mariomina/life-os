'use server'

// actions/skills.ts
// Server Actions para gestión de Habilidades del usuario.
// Story 7.1 — CRUD Habilidades (create, update, archive).
// Story 7.2 — Tag de skills en activities + tiempo invertido automático.
// Story 7.3 — Detección emergente de habilidades.
// Story 7.4 — Recalcular nivel desde timeInvestedSeconds.

import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { skills } from '@/lib/db/schema/skills'
import { stepSkillTags } from '@/lib/db/schema/step-skill-tags'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { timeEntries } from '@/lib/db/schema/time-entries'
import { detectEmergingSkills } from '@/features/skills/detection'
import type { EmergingSkillSuggestion } from '@/features/skills/detection'
import { computeSkillLevel } from '@/features/skills/level'
import { eq, and, gte, isNull, sql } from 'drizzle-orm'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface SkillActionResult {
  success: boolean
  skillId?: string
  error?: string
}

export interface CreateSkillData {
  name: string
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  areaId?: string | null
  /** Story 7.3 — true when created by the auto-detection engine */
  autoDetected?: boolean
}

export interface UpdateSkillData {
  name?: string
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  areaId?: string | null
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

// ─── Actions ──────────────────────────────────────────────────────────────────

/**
 * Creates a new skill for the authenticated user.
 * Validates name is non-empty and handles unique constraint (name per user).
 * Story 7.1 — AC1, AC2.
 */
export async function createSkill(data: CreateSkillData): Promise<SkillActionResult> {
  const trimmedName = data.name?.trim()
  if (!trimmedName) return { success: false, error: 'El nombre de la habilidad es requerido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const [newSkill] = await db
      .insert(skills)
      .values({
        userId,
        name: trimmedName,
        level: data.level ?? 'beginner',
        areaId: data.areaId ?? null,
        autoDetected: data.autoDetected ?? false,
      })
      .returning({ id: skills.id })

    revalidatePath('/skills')
    return { success: true, skillId: newSkill.id }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (
      msg.includes('unique') ||
      msg.includes('duplicate') ||
      msg.includes('skills_user_id_name_idx')
    ) {
      return { success: false, error: 'Ya existe una habilidad con ese nombre' }
    }
    console.error('[createSkill] failed:', err)
    return { success: false, error: 'Error al crear la habilidad' }
  }
}

/**
 * Updates name, level or area of an existing skill.
 * Ownership guard: only the skill owner can update.
 * Story 7.1 — AC3.
 */
export async function updateSkill(
  skillId: string,
  data: UpdateSkillData
): Promise<SkillActionResult> {
  if (!skillId?.trim()) return { success: false, error: 'ID de habilidad inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    // Ownership check
    const existing = await db
      .select({ id: skills.id })
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.userId, userId)))
      .limit(1)

    if (!existing[0]) return { success: false, error: 'Skill no encontrada' }

    const updatePayload: Record<string, unknown> = { updatedAt: new Date() }
    if (data.name !== undefined) {
      const trimmed = data.name.trim()
      if (!trimmed) return { success: false, error: 'El nombre no puede estar vacío' }
      updatePayload.name = trimmed
    }
    if (data.level !== undefined) updatePayload.level = data.level
    if (data.areaId !== undefined) updatePayload.areaId = data.areaId ?? null

    await db.update(skills).set(updatePayload).where(eq(skills.id, skillId))

    revalidatePath('/skills')
    return { success: true }
  } catch (err) {
    const msg = err instanceof Error ? err.message : ''
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return { success: false, error: 'Ya existe una habilidad con ese nombre' }
    }
    console.error('[updateSkill] failed:', err)
    return { success: false, error: 'Error al actualizar la habilidad' }
  }
}

/**
 * Soft-deletes a skill by setting archivedAt = now().
 * Preserves all time tracking history.
 * Ownership guard included.
 * Story 7.1 — AC4.
 */
export async function archiveSkill(skillId: string): Promise<SkillActionResult> {
  if (!skillId?.trim()) return { success: false, error: 'ID de habilidad inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    // Ownership check
    const existing = await db
      .select({ id: skills.id })
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.userId, userId)))
      .limit(1)

    if (!existing[0]) return { success: false, error: 'Skill no encontrada' }

    await db
      .update(skills)
      .set({ archivedAt: new Date(), updatedAt: new Date() })
      .where(eq(skills.id, skillId))

    revalidatePath('/skills')
    return { success: true }
  } catch (err) {
    console.error('[archiveSkill] failed:', err)
    return { success: false, error: 'Error al archivar la habilidad' }
  }
}

/**
 * Tags a step activity with a skill (inserts into step_skill_tags).
 * Idempotent: duplicate tag returns { success: true } without error.
 * Ownership guard: both activity and skill must belong to the authenticated user.
 * Story 7.2 — AC1, AC2, AC3.
 */
export async function tagActivityWithSkill(
  stepActivityId: string,
  skillId: string
): Promise<SkillActionResult> {
  if (!stepActivityId?.trim()) return { success: false, error: 'ID de actividad inválido' }
  if (!skillId?.trim()) return { success: false, error: 'ID de habilidad inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    // Ownership: activity must belong to user
    const [activity] = await db
      .select({ id: stepsActivities.id })
      .from(stepsActivities)
      .where(and(eq(stepsActivities.id, stepActivityId), eq(stepsActivities.userId, userId)))
      .limit(1)

    if (!activity) return { success: false, error: 'No autorizado' }

    // Ownership: skill must belong to user
    const [skill] = await db
      .select({ id: skills.id })
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.userId, userId)))
      .limit(1)

    if (!skill) return { success: false, error: 'No autorizado' }

    await db.insert(stepSkillTags).values({ stepActivityId, skillId, userId }).onConflictDoNothing()

    revalidatePath('/calendar')
    revalidatePath('/skills')
    return { success: true }
  } catch (err) {
    console.error('[tagActivityWithSkill] failed:', err)
    return { success: false, error: 'Error al etiquetar la actividad' }
  }
}

/**
 * Removes a skill tag from a step activity.
 * Ownership guard: the tag must belong to the authenticated user.
 * Story 7.2 — AC4.
 */
export async function removeSkillTag(
  stepActivityId: string,
  skillId: string
): Promise<SkillActionResult> {
  if (!stepActivityId?.trim()) return { success: false, error: 'ID de actividad inválido' }
  if (!skillId?.trim()) return { success: false, error: 'ID de habilidad inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    // Ownership check
    const [tag] = await db
      .select({ id: stepSkillTags.id })
      .from(stepSkillTags)
      .where(
        and(
          eq(stepSkillTags.stepActivityId, stepActivityId),
          eq(stepSkillTags.skillId, skillId),
          eq(stepSkillTags.userId, userId)
        )
      )
      .limit(1)

    if (!tag) return { success: false, error: 'Tag no encontrado' }

    await db.delete(stepSkillTags).where(eq(stepSkillTags.id, tag.id))

    revalidatePath('/calendar')
    revalidatePath('/skills')
    return { success: true }
  } catch (err) {
    console.error('[removeSkillTag] failed:', err)
    return { success: false, error: 'Error al eliminar el tag' }
  }
}

/**
 * Analyzes the user's recent activities (last 90 days) and suggests emerging skills.
 * Uses the `detectEmergingSkills` pure function for tokenization + threshold filtering.
 * Story 7.3 — AC3.
 */
export async function suggestSkillFromActivities(): Promise<EmergingSkillSuggestion[]> {
  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)

    // Get activities from the last 90 days with accumulated time
    const rows = await db
      .select({
        title: stepsActivities.title,
        totalSeconds: sql<number>`COALESCE(SUM(${timeEntries.durationSeconds}), 0)`,
      })
      .from(stepsActivities)
      .leftJoin(timeEntries, eq(timeEntries.stepActivityId, stepsActivities.id))
      .where(and(eq(stepsActivities.userId, userId), gte(stepsActivities.createdAt, ninetyDaysAgo)))
      .groupBy(stepsActivities.id, stepsActivities.title)

    // Get existing skill names to exclude from suggestions
    const existingSkillRows = await db
      .select({ name: skills.name })
      .from(skills)
      .where(and(eq(skills.userId, userId), isNull(skills.archivedAt)))

    const activities = rows.map((r) => ({
      title: r.title,
      totalSeconds: Number(r.totalSeconds),
    }))
    const existingSkillNames = existingSkillRows.map((s) => s.name)

    return detectEmergingSkills(activities, existingSkillNames)
  } catch (err) {
    console.error('[suggestSkillFromActivities] failed:', err)
    return []
  }
}

/**
 * Confirms an emerging skill suggestion by creating the skill with autoDetected=true.
 * Story 7.3 — AC4.
 */
export async function confirmEmergingSkill(
  term: string,
  level?: 'beginner' | 'intermediate' | 'advanced' | 'expert',
  areaId?: string | null
): Promise<SkillActionResult> {
  return createSkill({
    name: term,
    level: level ?? 'beginner',
    areaId: areaId ?? null,
    autoDetected: true,
  })
}

/**
 * Dismisses an emerging skill suggestion.
 * MVP: actual persistence handled client-side via localStorage.
 * Returns success so the UI can update optimistically.
 * Story 7.3 — AC5.
 */
export async function dismissEmergingSkill(term: string): Promise<SkillActionResult> {
  if (!term?.trim()) return { success: false, error: 'Término inválido' }
  // MVP: persistence via localStorage in SkillsClient
  return { success: true }
}

/**
 * Recalculates skill level from timeInvestedSeconds and updates DB if changed.
 * Acts as a safety net to keep level in sync with accumulated time.
 * Story 7.4 — AC3.
 */
export async function recalculateSkillLevel(
  skillId: string
): Promise<{ success: boolean; levelChanged?: boolean; newLevel?: string; error?: string }> {
  if (!skillId?.trim()) return { success: false, error: 'ID de habilidad inválido' }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const [skill] = await db
      .select({
        id: skills.id,
        level: skills.level,
        timeInvestedSeconds: skills.timeInvestedSeconds,
      })
      .from(skills)
      .where(and(eq(skills.id, skillId), eq(skills.userId, userId)))
      .limit(1)

    if (!skill) return { success: false, error: 'Skill no encontrada' }

    const newLevel = computeSkillLevel(skill.timeInvestedSeconds)
    if (newLevel === skill.level) return { success: true, levelChanged: false }

    await db
      .update(skills)
      .set({ level: newLevel, updatedAt: new Date() })
      .where(eq(skills.id, skillId))

    revalidatePath('/skills')
    return { success: true, levelChanged: true, newLevel }
  } catch (err) {
    console.error('[recalculateSkillLevel] failed:', err)
    return { success: false, error: 'Error al recalcular nivel' }
  }
}
