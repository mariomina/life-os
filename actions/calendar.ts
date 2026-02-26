'use server'

// actions/calendar.ts
// Server Actions para CRUD de actividades en el Calendario.
// Crea y elimina entradas en steps_activities; obtiene áreas del usuario.
// Story 5.7 — CRUD Eventos desde el Calendario.

import { eq, and, asc } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { areas } from '@/lib/db/schema/areas'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ActionResult {
  error: string | null
}

export interface AreaOption {
  id: string
  name: string
  maslowLevel: number
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
 * Creates a spontaneous (non-planned) activity in the calendar.
 * Validates title, date/time, and areaId before inserting.
 */
export async function createActivity(formData: FormData): Promise<ActionResult> {
  const title = (formData.get('title') as string | null) ?? ''
  const date = (formData.get('date') as string | null) ?? ''
  const time = (formData.get('time') as string | null) ?? ''
  const duration = Number(formData.get('duration') ?? 30)
  const areaId = (formData.get('areaId') as string | null) ?? ''

  // Validate inputs
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return { error: 'El título es requerido' }
  if (trimmedTitle.length > 100) return { error: 'El título no puede superar 100 caracteres' }
  if (!areaId || !UUID_REGEX.test(areaId)) return { error: 'Selecciona un área válida' }
  if (!date || !time) return { error: 'La fecha y hora son requeridas' }

  const scheduledAt = new Date(`${date}T${time}:00`)
  if (isNaN(scheduledAt.getTime())) return { error: 'Fecha u hora inválida' }

  const durationMinutes = isNaN(duration) || duration <= 0 ? 30 : duration

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    await db.insert(stepsActivities).values({
      userId,
      title: trimmedTitle,
      scheduledAt,
      scheduledDurationMinutes: durationMinutes,
      areaId,
      status: 'pending',
      planned: false,
      executorType: 'human',
    })

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[createActivity] failed:', err)
    return { error: 'No se pudo crear la actividad. Inténtalo de nuevo.' }
  }
}

/**
 * Deletes an activity by ID.
 * Validates UUID format and enforces userId ownership before deleting.
 */
export async function deleteActivity(activityId: string): Promise<ActionResult> {
  if (!activityId || !UUID_REGEX.test(activityId)) {
    return { error: 'ID de actividad inválido' }
  }

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    await db
      .delete(stepsActivities)
      .where(and(eq(stepsActivities.id, activityId), eq(stepsActivities.userId, userId)))

    revalidatePath('/calendar')
    return { error: null }
  } catch (err) {
    console.error('[deleteActivity] failed:', err)
    return { error: 'No se pudo eliminar la actividad.' }
  }
}

/**
 * Returns the list of areas for the authenticated user, ordered by Maslow level.
 * Used to populate the area select in the NewActivityModal.
 */
export async function getAreasForUser(): Promise<AreaOption[]> {
  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const rows = await db
      .select({ id: areas.id, name: areas.name, maslowLevel: areas.maslowLevel })
      .from(areas)
      .where(eq(areas.userId, userId))
      .orderBy(asc(areas.maslowLevel))

    return rows
  } catch (err) {
    console.error('[getAreasForUser] failed:', err)
    return []
  }
}
