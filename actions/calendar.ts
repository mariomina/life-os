'use server'

// actions/calendar.ts
// Server Actions para CRUD de actividades en el Calendario.
// Crea y elimina entradas en steps_activities; obtiene áreas del usuario.
// Story 5.7 — CRUD Eventos desde el Calendario.
// Story 10.4 — Recurrencia: crea múltiples ocurrencias agrupadas por recurrenceGroupId.
// Story 10.6 — Recurrencia 'workdays': filtra festivos del usuario post-generación.
// Story 10.7 — Tipo 'custom' con interval/unit/daysOfWeek/excludeHolidays.

import { eq, and, asc } from 'drizzle-orm'
import { format } from 'date-fns'
import { revalidatePath } from 'next/cache'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { db, assertDatabaseUrl } from '@/lib/db/client'
import { stepsActivities } from '@/lib/db/schema/steps-activities'
import { areas } from '@/lib/db/schema/areas'
import { getHolidaysForUser } from '@/lib/db/queries/holidays'
import {
  generateOccurrences,
  type RecurrenceType,
  type RecurrenceUnit,
  type RecurrenceOptions,
} from '@/lib/calendar/recurrence-utils'

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
 *
 * Story 10.4: si recurrenceType !== 'none', genera múltiples ocurrencias
 * agrupadas por recurrenceGroupId (UUID compartido).
 */
export async function createActivity(formData: FormData): Promise<ActionResult> {
  const title = (formData.get('title') as string | null) ?? ''
  const date = (formData.get('date') as string | null) ?? ''
  const time = (formData.get('time') as string | null) ?? ''
  const duration = Number(formData.get('duration') ?? 30)
  const areaId = (formData.get('areaId') as string | null) ?? ''
  const calendarId = (formData.get('calendarId') as string | null) || null

  // Recurrence fields
  const recurrenceType = ((formData.get('recurrenceType') as string | null) ??
    'none') as RecurrenceType
  const recurrenceEndType = ((formData.get('recurrenceEndType') as string | null) ?? 'count') as
    | 'count'
    | 'date'
    | 'never'
  const recurrenceCount = Math.max(1, Number(formData.get('recurrenceCount') ?? 1))
  const recurrenceEndDate = (formData.get('recurrenceEndDate') as string | null) ?? ''
  // Custom recurrence fields (Story 10.7)
  const recurrenceInterval = Math.max(1, Number(formData.get('recurrenceInterval') ?? 1))
  const recurrenceUnit = ((formData.get('recurrenceUnit') as string | null) ??
    'week') as RecurrenceUnit
  const recurrenceDaysRaw = (formData.get('recurrenceDays') as string | null) ?? '[]'
  const recurrenceDays: number[] = JSON.parse(recurrenceDaysRaw)
  const recurrenceExcludeHolidays = formData.get('recurrenceExcludeHolidays') === 'true'

  // Validate inputs
  const trimmedTitle = title.trim()
  if (!trimmedTitle) return { error: 'El título es requerido' }
  if (trimmedTitle.length > 100) return { error: 'El título no puede superar 100 caracteres' }
  if (!date || !time) return { error: 'La fecha y hora son requeridas' }

  const scheduledAt = new Date(`${date}T${time}:00`)
  if (isNaN(scheduledAt.getTime())) return { error: 'Fecha u hora inválida' }

  const durationMinutes = isNaN(duration) || duration <= 0 ? 30 : duration

  try {
    assertDatabaseUrl()
    const userId = await getAuthenticatedUserId()

    const baseFields = {
      userId,
      title: trimmedTitle,
      scheduledDurationMinutes: durationMinutes,
      areaId: areaId && UUID_REGEX.test(areaId) ? areaId : null,
      calendarId: calendarId ?? null,
      status: 'pending' as const,
      planned: false,
      executorType: 'human' as const,
    }

    if (recurrenceType === 'none') {
      // Actividad simple — comportamiento original
      await db.insert(stepsActivities).values({ ...baseFields, scheduledAt })
    } else {
      // Actividad recurrente — genera todas las ocurrencias
      const recurrenceOptions: RecurrenceOptions = {
        type: recurrenceType,
        endType: recurrenceEndType,
        count: recurrenceCount,
        endDate: recurrenceEndDate,
        interval: recurrenceInterval,
        unit: recurrenceUnit,
        daysOfWeek: recurrenceDays,
        excludeHolidays: recurrenceExcludeHolidays,
      }
      let occurrences = generateOccurrences(scheduledAt, recurrenceOptions)

      // Story 10.7: filtrar festivos cuando excludeHolidays=true (aplica a cualquier tipo)
      if (recurrenceExcludeHolidays) {
        const userHolidays = await getHolidaysForUser(userId)
        const holidayDates = new Set(userHolidays.map((h) => h.date)) // Set<'YYYY-MM-DD'>
        occurrences = occurrences.filter((d) => !holidayDates.has(format(d, 'yyyy-MM-dd')))
      }

      if (occurrences.length === 0) {
        return { error: 'No se generaron ocurrencias con los parámetros indicados' }
      }
      const recurrenceGroupId = crypto.randomUUID()
      await db
        .insert(stepsActivities)
        .values(
          occurrences.map((date) => ({ ...baseFields, scheduledAt: date, recurrenceGroupId }))
        )
    }

    revalidatePath('/calendar')
    revalidatePath('/reports')
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
