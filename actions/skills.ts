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
import { eq, and } from 'drizzle-orm'

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
        autoDetected: false,
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
